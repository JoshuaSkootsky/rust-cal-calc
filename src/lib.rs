#![deny(clippy::all)]

use napi_derive::napi;

#[napi]
pub fn get_day_of_week(year: i32, month: i32, day: i32) -> String {

     // Validate inputs
     if month < 1 || month > 12 {
        return "Invalid month".to_string();
    }
    if day < 1 || day > 31 {
        return "Invalid day".to_string();
    }
    
    let (m, y) = if month <= 2 {
        (month + 12, year - 1)
    } else {
        (month, year)
    };

    let k = day;
    let d = y % 100;
    let c = y / 100;

    let f = k + ((13 * (m + 1)) / 5) + d + (d / 4) + (c / 4) - (2 * c);
    let day_number = ((f % 7) + 7) % 7;

    match day_number {
        0 => "Saturday".to_string(),
        1 => "Sunday".to_string(),
        2 => "Monday".to_string(),
        3 => "Tuesday".to_string(),
        4 => "Wednesday".to_string(),
        5 => "Thursday".to_string(),
        6 => "Friday".to_string(),
        _ => "Invalid day".to_string(),
    }
}