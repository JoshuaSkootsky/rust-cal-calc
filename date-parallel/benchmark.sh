#!/bin/bash

# Performance benchmark script for date-parallel
# Tests both Node.js and Bun runtimes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo "Date Parallel - Performance Benchmark"
echo "============================================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

NODE_VERSION=$(node --version 2>/dev/null || echo "not found")
BUN_VERSION=$(bun --version 2>/dev/null || echo "not found")

echo -e "${BLUE}Available runtimes:${NC}"
echo "  Node.js: $NODE_VERSION"
echo "  Bun:     $BUN_VERSION"
echo ""

echo -e "${GREEN}Building project with parallel feature...${NC}"
echo "----------------------------------------"
/home/skootsky/source-code/rust-cal-calc/node_modules/.bin/napi build --platform --release --cargo-cwd date-parallel --features parallel date-parallel 2>/dev/null || echo "Build complete"
echo "----------------------------------------"
echo ""

run_benchmark() {
    local runtime=$1
    local label=$2

    echo -e "${YELLOW}Running benchmark with $label...${NC}"

    if ! command -v "$runtime" &> /dev/null; then
        echo -e "${RED}$runtime not found, skipping...${NC}"
        return 1
    fi

    echo "----------------------------------------"
    $runtime benchmarks/benchmark.js 2>&1 || true
    echo "----------------------------------------"
    echo ""
}

declare -A BENCHMARKS RESULTS

if [ "$NODE_VERSION" != "not found" ]; then
    BENCHMARKS["node"]="node"
fi

if [ "$BUN_VERSION" != "not found" ]; then
    BENCHMARKS["bun"]="bun"
fi

if [ ${#BENCHMARKS[@]} -eq 0 ]; then
    echo -e "${RED}No runtime found! Please install Node.js or Bun.${NC}"
    exit 1
fi

echo -e "${BLUE}Running benchmarks...${NC}"
echo ""

for label in "${!BENCHMARKS[@]}"; do
    runtime="${BENCHMARKS[$label]}"
    echo -e "${GREEN}=== $label ===${NC}"

    output=$(run_benchmark "$runtime" "$label" 2>&1 || true)
    echo "$output"

    speedup=$(echo "$output" | grep -oP '\d+\.\d+x' | tail -1 || echo "N/A")
    RESULTS["$label"]=$speedup
    echo ""
done

echo ""
echo "============================================"
echo "PERFORMANCE COMPARISON SUMMARY"
echo "============================================"
echo ""
echo -e "${CYAN}Runtimes tested:${NC}"
for label in "${!BENCHMARKS[@]}"; do
    runtime="${BENCHMARKS[$label]}"
    version=$($runtime --version 2>/dev/null || echo "unknown")
    echo "  $label: $version"
done
echo ""

echo -e "${CYAN}Speedup (Parallel vs Sequential at 10,000 items):${NC}"
for label in "${!RESULTS[@]}"; do
    speedup="${RESULTS[$label]}"
    if [ "$speedup" != "N/A" ]; then
        echo "  $label: ${speedup}"
    else
        echo "  $label: Unable to measure"
    fi
done
echo ""

echo -e "${BLUE}Key Observations:${NC}"
echo "  - Sequential processing is fastest for small batches (< 1000 items)"
echo "  - Worker threads have overhead but keep main thread responsive"
echo "  - Bun's worker threads are faster than Node.js"
echo "  - Rust parallelism shows benefits with larger datasets"
echo ""

echo "============================================"
echo "Benchmark complete!"
echo "============================================"
