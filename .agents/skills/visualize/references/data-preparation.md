# Data Preparation

Transform data into formats suitable for visualization. Most visualization failures stem from data problems, not encoding problems. Verify D3 data manipulation APIs (d3.group, d3.rollup, d3.bin) against the current D3 documentation before using.

## Why Data Preparation Matters

Visualization libraries expect data in specific shapes. Raw data rarely matches those expectations. The gap between "data as stored" and "data as visualized" requires transformation.

Common mismatches:

- **Wide vs. long format**: Your data is one row per entity with multiple columns; the library wants one row per observation.
- **Aggregation level**: Your data is individual transactions; the chart needs daily totals.
- **Missing values**: Your data has gaps; the library needs explicit handling.
- **Type mismatches**: Your dates are strings; D3 expects Date objects.

## Data Shapes

### Wide Format

One row per entity, attributes in columns:

```javascript
const wideData = [
  { country: "USA", sales2020: 100, sales2021: 120, sales2022: 150 },
  { country: "UK",  sales2020: 80,  sales2021: 95,  sales2022: 110 }
];
```

**Good for**: Tables, heatmaps, parallel coordinates
**Bad for**: Line charts over time, stacked bars, faceted displays

### Long Format (Tidy Data)

One row per observation, variables in columns:

```javascript
const longData = [
  { country: "USA", year: 2020, sales: 100 },
  { country: "USA", year: 2021, sales: 120 },
  { country: "USA", year: 2022, sales: 150 },
  { country: "UK",  year: 2020, sales: 80 },
  { country: "UK",  year: 2021, sales: 95 },
  { country: "UK",  year: 2022, sales: 110 }
];
```

**Good for**: Line charts, bar charts, most D3 bindable formats
**Required for**: d3.group(), d3.rollup(), most joins

### Hierarchical Format

Nested structure for trees and hierarchies:

```javascript
const hierarchyData = {
  name: "root",
  children: [
    {
      name: "Category A",
      children: [
        { name: "Item 1", value: 100 },
        { name: "Item 2", value: 80 }
      ]
    },
    {
      name: "Category B",
      value: 200
    }
  ]
};
```

**Required for**: Treemaps, sunbursts, tree diagrams, circle packing

### Network Format

Nodes and edges:

```javascript
const networkData = {
  nodes: [
    { id: "A", name: "Node A" },
    { id: "B", name: "Node B" },
    { id: "C", name: "Node C" }
  ],
  links: [
    { source: "A", target: "B", value: 10 },
    { source: "B", target: "C", value: 5 }
  ]
};
```

**Required for**: Force-directed graphs, Sankey diagrams, chord diagrams

## Transformation Patterns

### Wide to Long (Melt/Unpivot)

```javascript
function wideToLong(data, idVars, valueVars, varName = "variable", valueName = "value") {
  return data.flatMap(row =>
    valueVars.map(col => ({
      ...Object.fromEntries(idVars.map(id => [id, row[id]])),
      [varName]: col,
      [valueName]: row[col]
    }))
  );
}

// Usage
const long = wideToLong(
  wideData,
  ["country"],           // ID columns to keep
  ["sales2020", "sales2021", "sales2022"],  // Value columns to melt
  "year",                // Name for the variable column
  "sales"                // Name for the value column
);
```

### Long to Wide (Pivot)

```javascript
function longToWide(data, index, columns, values) {
  const result = d3.group(data, d => d[index]);
  return Array.from(result, ([key, rows]) => ({
    [index]: key,
    ...Object.fromEntries(rows.map(r => [r[columns], r[values]]))
  }));
}

// Usage
const wide = longToWide(longData, "country", "year", "sales");
```

### Flat to Hierarchical

```javascript
function flatToHierarchy(data, keys) {
  // keys = ["category", "subcategory", "item"]
  const root = { name: "root", children: [] };

  data.forEach(row => {
    let current = root;
    keys.forEach((key, i) => {
      const value = row[key];
      let child = current.children?.find(c => c.name === value);

      if (!child) {
        child = { name: value, children: [] };
        current.children = current.children || [];
        current.children.push(child);
      }

      if (i === keys.length - 1) {
        // Leaf node: add value, remove children
        delete child.children;
        child.value = row.value;
      }

      current = child;
    });
  });

  return root;
}
```

### D3 Stratify for Flat Hierarchies

When you have parent references in flat data:

```javascript
const flatData = [
  { id: "root", parent: null },
  { id: "A", parent: "root", value: 100 },
  { id: "B", parent: "root", value: 200 },
  { id: "A1", parent: "A", value: 50 }
];

const root = d3.stratify()
  .id(d => d.id)
  .parentId(d => d.parent)
  (flatData);
```

## Aggregation Patterns

### Grouping with d3.group

```javascript
// Single-level grouping
const byCountry = d3.group(data, d => d.country);
// Map { "USA" => [...], "UK" => [...] }

// Multi-level grouping
const byCountryAndYear = d3.group(data, d => d.country, d => d.year);
// Map { "USA" => Map { 2020 => [...], 2021 => [...] } }
```

### Aggregation with d3.rollup

```javascript
// Sum by country
const totals = d3.rollup(data,
  v => d3.sum(v, d => d.sales),  // Aggregation function
  d => d.country                  // Grouping key
);
// Map { "USA" => 370, "UK" => 285 }

// Multiple aggregations
const stats = d3.rollup(data,
  v => ({
    sum: d3.sum(v, d => d.sales),
    mean: d3.mean(v, d => d.sales),
    count: v.length
  }),
  d => d.country
);
```

### Binning for Histograms

```javascript
const bins = d3.bin()
  .value(d => d.value)
  .domain([0, 100])
  .thresholds(10)
  (data);

// Each bin: { x0: start, x1: end, length: count, [...elements] }
```

### Time-based Aggregation

```javascript
// Group by day
const byDay = d3.rollup(data,
  v => d3.sum(v, d => d.value),
  d => d3.timeDay(d.date)  // Floor to day
);

// Group by week
const byWeek = d3.rollup(data,
  v => d3.sum(v, d => d.value),
  d => d3.timeWeek(d.date)
);

// Group by month
const byMonth = d3.rollup(data,
  v => d3.sum(v, d => d.value),
  d => d3.timeMonth(d.date)
);
```

## Derived Fields

### Calculated Columns

```javascript
const enriched = data.map(d => ({
  ...d,
  percentOfTotal: d.value / d3.sum(data, e => e.value),
  yearOverYear: d.value - previousValue(d),
  isOutlier: Math.abs(d.value - mean) > 2 * stdDev
}));
```

### Running Totals and Moving Averages

```javascript
// Cumulative sum
let cumulative = 0;
const withCumulative = data.map(d => ({
  ...d,
  cumulative: cumulative += d.value
}));

// Moving average (window of n)
function movingAverage(data, n, accessor) {
  return data.map((d, i) => {
    const window = data.slice(Math.max(0, i - n + 1), i + 1);
    return {
      ...d,
      movingAvg: d3.mean(window, accessor)
    };
  });
}
```

### Percent of Parent (for Hierarchies)

```javascript
function addPercentOfParent(node) {
  if (node.children) {
    const total = d3.sum(node.children, d => d.value);
    node.children.forEach(child => {
      child.percentOfParent = child.value / total;
      addPercentOfParent(child);
    });
  }
  return node;
}
```

## Missing Value Handling

### Detection

```javascript
const hasMissing = data.some(d =>
  d.value === null ||
  d.value === undefined ||
  Number.isNaN(d.value)
);
```

### Strategies

**Filter out missing**:

```javascript
const clean = data.filter(d => d.value != null);
```

**Fill with constant**:

```javascript
const filled = data.map(d => ({
  ...d,
  value: d.value ?? 0
}));
```

**Forward fill** (use previous value):

```javascript
let lastValid = null;
const forwardFilled = data.map(d => {
  if (d.value != null) lastValid = d.value;
  return { ...d, value: d.value ?? lastValid };
});
```

**Interpolate**:

```javascript
// Linear interpolation for time series
const interpolated = data.map((d, i) => {
  if (d.value != null) return d;

  // Find surrounding valid values
  const before = data.slice(0, i).reverse().find(e => e.value != null);
  const after = data.slice(i + 1).find(e => e.value != null);

  if (!before || !after) return { ...d, value: before?.value ?? after?.value };

  // Linear interpolation
  const t = (d.date - before.date) / (after.date - before.date);
  return { ...d, value: before.value + t * (after.value - before.value) };
});
```

## Type Coercion

### Parse Dates

```javascript
const parseDate = d3.timeParse("%Y-%m-%d");

const withDates = data.map(d => ({
  ...d,
  date: parseDate(d.dateString)
}));
```

Common format specifiers:

- `%Y-%m-%d` → 2024-01-15
- `%m/%d/%Y` → 01/15/2024
- `%B %d, %Y` → January 15, 2024
- `%Y-%m-%dT%H:%M:%S` → ISO 8601

### Parse Numbers

```javascript
// CSV values come as strings
const withNumbers = data.map(d => ({
  ...d,
  value: +d.value,  // Shorthand for Number(d.value)
  count: parseInt(d.count, 10),
  ratio: parseFloat(d.ratio)
}));
```

### Clean String Categories

```javascript
const normalized = data.map(d => ({
  ...d,
  category: d.category.trim().toLowerCase()
}));
```

## Validation Checks

Before visualizing, verify data integrity:

```javascript
function validateData(data, schema) {
  const issues = [];

  data.forEach((row, i) => {
    // Check required fields
    schema.required?.forEach(field => {
      if (row[field] == null) {
        issues.push(`Row ${i}: missing required field '${field}'`);
      }
    });

    // Check types
    Object.entries(schema.types || {}).forEach(([field, type]) => {
      if (type === "number" && typeof row[field] !== "number") {
        issues.push(`Row ${i}: '${field}' should be number, got ${typeof row[field]}`);
      }
      if (type === "date" && !(row[field] instanceof Date)) {
        issues.push(`Row ${i}: '${field}' should be Date`);
      }
    });

    // Check ranges
    Object.entries(schema.ranges || {}).forEach(([field, [min, max]]) => {
      if (row[field] < min || row[field] > max) {
        issues.push(`Row ${i}: '${field}' value ${row[field]} outside range [${min}, ${max}]`);
      }
    });
  });

  return issues;
}

// Usage
const issues = validateData(data, {
  required: ["date", "value", "category"],
  types: { date: "date", value: "number" },
  ranges: { value: [0, 1000000] }
});

if (issues.length > 0) {
  console.warn("Data validation issues:", issues);
}
```

## Integration with Visualization

### Data Joins in D3

Prepared data flows into D3's data join:

```javascript
// Long format data binds directly to elements
const bars = svg.selectAll("rect")
  .data(preparedData, d => d.id)  // Key function for object constancy
  .join(
    enter => enter.append("rect")...,
    update => update...,
    exit => exit.remove()
  );
```

### Pre-computed Layout Data

For complex visualizations, pre-compute layout during data preparation:

```javascript
// For pie chart
const pie = d3.pie().value(d => d.value);
const arcs = pie(data);  // Pre-computed arc data

// For force layout
const simulation = d3.forceSimulation(nodes)...;
// Run simulation to completion
for (let i = 0; i < 300; i++) simulation.tick();
// Now nodes have x, y positions
```

## Sources

- D3.js documentation — <https://d3js.org/getting-started>
- D3 API Reference — <https://github.com/d3/d3/blob/main/API.md>
- Wickham, H. (2014). "Tidy Data." *Journal of Statistical Software*, 59(10). <https://doi.org/10.18637/jss.v059.i10>
