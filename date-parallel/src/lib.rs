use chrono::{Datelike, NaiveDate};
use napi::Result;
use napi_derive::napi;
use std::sync::OnceLock;

#[cfg(feature = "parallel")]
use rayon::iter::{IntoParallelRefIterator, ParallelIterator};

fn parse_date(date_str: &str) -> Result<NaiveDate> {
    NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
        .map_err(|e| napi::Error::new(napi::Status::InvalidArg, format!("Invalid date '{}': {}", date_str, e)))
}

fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

#[napi]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[napi]
pub fn get_features() -> Vec<String> {
    let mut features = vec!["napi".to_string()];
    #[cfg(feature = "parallel")]
    features.push("rayon".to_string());
    features
}

#[napi]
pub fn get_cpu_count() -> i32 {
    num_cpus::get() as i32
}

#[napi]
pub fn calculate_date_difference(start_date: String, end_date: String) -> Result<String> {
    let start = parse_date(&start_date)?;
    let end = parse_date(&end_date)?;

    let total_days = (end - start).num_days();
    let weeks = total_days as f64 / 7.0;
    let months = total_days as f64 / 30.44;
    let years = total_days as f64 / 365.25;

    Ok(format!("{},{},{},{},{},{},{}",
        start_date,
        end_date,
        total_days,
        weeks,
        months,
        years,
        is_leap_year(start.year())
    ))
}

#[napi]
pub fn calculate_date_differences_sequential(pairs_json: String) -> Result<String> {
    let pairs: Vec<(String, String)> = serde_json::from_str(&pairs_json)
        .map_err(|e| napi::Error::new(napi::Status::InvalidArg, format!("Invalid JSON: {}", e)))?;

    let mut results = Vec::new();

    for (start_date, end_date) in &pairs {
        let start = parse_date(start_date)?;
        let end = parse_date(end_date)?;

        let total_days = (end - start).num_days();
        let weeks = total_days as f64 / 7.0;
        let months = total_days as f64 / 30.44;
        let years = total_days as f64 / 365.25;

        results.push(serde_json::json!({
            "startDate": start_date,
            "endDate": end_date,
            "days": total_days,
            "weeks": format!("{:.2}", weeks),
            "months": format!("{:.2}", months),
            "years": format!("{:.2}", years),
            "isLeapYear": is_leap_year(start.year())
        }));
    }

    serde_json::to_string(&results)
        .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("JSON error: {}", e)))
}

#[napi]
pub async fn calculate_date_differences_parallel(pairs_json: String) -> Result<String> {
    let pairs: Vec<(String, String)> = serde_json::from_str(&pairs_json)
        .map_err(|e| napi::Error::new(napi::Status::InvalidArg, format!("Invalid JSON: {}", e)))?;

    #[cfg(feature = "parallel")]
    {
        init_rayon();

        let start = std::time::Instant::now();

        let results: Vec<serde_json::Value> = pairs
            .par_iter()
            .map(|(start_date, end_date)| {
                let start = parse_date(start_date).expect("Failed to parse start date");
                let end = parse_date(end_date).expect("Failed to parse end date");

                let total_days = (end - start).num_days();
                let weeks = total_days as f64 / 7.0;
                let months = total_days as f64 / 30.44;
                let years = total_days as f64 / 365.25;

                serde_json::json!({
                    "startDate": start_date,
                    "endDate": end_date,
                    "days": total_days,
                    "weeks": format!("{:.2}", weeks),
                    "months": format!("{:.2}", months),
                    "years": format!("{:.2}", years),
                    "isLeapYear": is_leap_year(start.year())
                })
            })
            .collect();

        let elapsed_ms = start.elapsed().as_millis() as f64;

        let output = serde_json::json!({
            "results": results,
            "elapsedMs": elapsed_ms,
            "count": pairs.len(),
            "parallelized": true
        });

        serde_json::to_string(&output)
            .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("JSON error: {}", e)))
    }

    #[cfg(not(feature = "parallel"))]
    {
        let start = std::time::Instant::now();

        let results: Vec<serde_json::Value> = pairs
            .iter()
            .map(|(start_date, end_date)| {
                let start = parse_date(start_date).expect("Failed to parse start date");
                let end = parse_date(end_date).expect("Failed to parse end date");

                let total_days = (end - start).num_days();
                let weeks = total_days as f64 / 7.0;
                let months = total_days as f64 / 30.44;
                let years = total_days as f64 / 365.25;

                serde_json::json!({
                    "startDate": start_date,
                    "endDate": end_date,
                    "days": total_days,
                    "weeks": format!("{:.2}", weeks),
                    "months": format!("{:.2}", months),
                    "years": format!("{:.2}", years),
                    "isLeapYear": is_leap_year(start.year())
                })
            })
            .collect();

        let elapsed_ms = start.elapsed().as_millis() as f64;

        let output = serde_json::json!({
            "results": results,
            "elapsedMs": elapsed_ms,
            "count": pairs.len(),
            "parallelized": false
        });

        serde_json::to_string(&output)
            .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("JSON error: {}", e)))
    }
}

#[cfg(feature = "parallel")]
static RAYON_INIT: OnceLock<()> = OnceLock::new();

#[cfg(feature = "parallel")]
fn init_rayon() {
    RAYON_INIT.get_or_init(|| {
        rayon::ThreadPoolBuilder::new()
            .num_threads(num_cpus::get())
            .build_global()
            .expect("Failed to initialize Rayon thread pool");
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_single_difference() {
        let result = calculate_date_difference(
            "2024-01-01".to_string(),
            "2024-01-31".to_string(),
        ).unwrap();

        assert!(result.contains("30"));
    }

    #[test]
    fn test_leap_year() {
        let result = calculate_date_difference(
            "2024-01-01".to_string(),
            "2025-01-01".to_string(),
        ).unwrap();

        assert!(result.contains("366"));
        assert!(result.contains("true"));
    }
}
