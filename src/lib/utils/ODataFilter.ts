/**
 * 🧱 ODataFilter Utility
 * 
 * A specialized utility for constructing RESO-compliant OData $filter strings.
 * Enforces business defaults and provides a fluent API for logical operations.
 */

export type ODataOperator = 'eq' | 'gt' | 'lt';

export class ODataFilter {
  private conditions: string[] = [];
  private includeDefaultStatus: boolean = true;

  constructor() {
    // Initializing with the business default requirement
    this.conditions.push("StandardStatus eq 'Active'");
  }

  /**
   * Disables the automatic 'StandardStatus eq 'Active'' filter.
   */
  withoutDefaults(): this {
    this.includeDefaultStatus = false;
    this.conditions = this.conditions.filter(c => !c.startsWith('StandardStatus eq'));
    return this;
  }

  /**
   * Adds an 'eq' (Equal) condition.
   */
  eq(field: string, value: string | number | boolean): this {
    this.conditions.push(`${field} eq ${this.formatValue(value)}`);
    return this;
  }

  /**
   * Adds a case-insensitive 'eq' condition using the OData tolower() function.
   * Wraps the field in 'tolower()' and lowercases the search value if it's a string.
   */
  eqIgnoreCase(field: string, value: string): this {
    const normalizedValue = typeof value === 'string' ? value.toLowerCase() : value;
    this.conditions.push(`tolower(${field}) eq ${this.formatValue(normalizedValue)}`);
    return this;
  }

  /**
   * Adds a 'gt' (Greater Than) condition.
   */
  gt(field: string, value: string | number | boolean): this {
    this.conditions.push(`${field} gt ${this.formatValue(value)}`);
    return this;
  }

  /**
   * Adds a geospatial distance filter ($filter=geo.distance(field, POINT(lon lat)) lt radius).
   */
  near(field: string, lat: number, lon: number, radiusInMiles: number): this {
    // POINT syntax is space-separated: POINT(lon lat)
    this.conditions.push(`geo.distance(${field}, POINT(${lon} ${lat})) lt ${radiusInMiles}`);
    return this;
  }

  /**
   * Adds a 'contains' string filter.
   */
  contains(field: string, value: string): this {
    this.conditions.push(`contains(${field},${this.formatValue(value)})`);
    return this;
  }

  /**
   * Adds an 'lt' (Less Than) condition.
   */
  lt(field: string, value: string | number | boolean): this {
    this.conditions.push(`${field} lt ${this.formatValue(value)}`);
    return this;
  }

  /**
   * Adds an OData 'any' lambda function ($filter=Field/any(a: a eq 'value')).
   * Used for collection-valued properties like Heating, Appliances, etc.
   * 
   * @param field The collection field name
   * @param values A single value or array of values to match against (joined by 'or')
   */
  any(field: string, values: string | string[]): this {
    const valueArray = Array.isArray(values) ? values : [values];
    if (valueArray.length === 0) return this;

    const comparisons = valueArray
      .map(v => `a eq ${this.formatValue(v)}`)
      .join(' or ');

    this.conditions.push(`${field}/any(a: ${comparisons})`);
    return this;
  }

  /**
   * Adds an OData 'all' lambda function ($filter=Field/all(a: a eq 'value')).
   * Ensures that EVERY element in the collection matches at least one of the provided values.
   */
  all(field: string, values: string | string[]): this {
    const valueArray = Array.isArray(values) ? values : [values];
    if (valueArray.length === 0) return this;

    const comparisons = valueArray
      .map(v => `a eq ${this.formatValue(v)}`)
      .join(' or ');

    this.conditions.push(`${field}/all(a: ${comparisons})`);
    return this;
  }

  /**
   * Adds a filter using a date extraction function (year, month, day).
   * Example: $filter=year(CloseDate) eq 2023
   */
  year(field: string, op: 'eq' | 'gt' | 'lt' | 'ge' | 'le', value: number): this {
    this.conditions.push(`year(${field}) ${op} ${value}`);
    return this;
  }

  month(field: string, op: 'eq' | 'gt' | 'lt' | 'ge' | 'le', value: number): this {
    this.conditions.push(`month(${field}) ${op} ${value}`);
    return this;
  }

  day(field: string, op: 'eq' | 'gt' | 'lt' | 'ge' | 'le', value: number): this {
    this.conditions.push(`day(${field}) ${op} ${value}`);
    return this;
  }

  /**
   * Adds a 'startswith' string filter.
   */
  startsWith(field: string, value: string): this {
    this.conditions.push(`startswith(${field}, ${this.formatValue(value)})`);
    return this;
  }

  /**
   * Adds an 'endswith' string filter.
   */
  endsWith(field: string, value: string): this {
    this.conditions.push(`endswith(${field}, ${this.formatValue(value)})`);
    return this;
  }

  /**
   * Composite helper for financial quarter filtering.
   */
  quarter(field: string, yearValue: number, q: 1 | 2 | 3 | 4): this {
    this.year(field, 'eq', yearValue);
    
    if (q === 1) {
      this.month(field, 'le', 3);
    } else if (q === 2) {
      this.month(field, 'ge', 4);
      this.month(field, 'le', 6);
    } else if (q === 3) {
      this.month(field, 'ge', 7);
      this.month(field, 'le', 9);
    } else if (q === 4) {
      this.month(field, 'ge', 10);
    }
    
    return this;
  }

  /**
   * Adds a geospatial intersection filter (polygon search).
   * Ensures the polygon is closed (first point == last point) per WKT standards.
   */
  intersects(field: string, points: { lat: number, lon: number }[]): this {
    if (points.length < 3) return this;

    // Deep copy to avoid mutating source
    const coords = [...points];

    // Ensure polygon is closed for WKT compliance
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first.lat !== last.lat || first.lon !== last.lon) {
      coords.push(first);
    }

    const wkt = coords.map(p => `${p.lon} ${p.lat}`).join(', ');
    this.conditions.push(`geo.intersects(${field}, geography'POLYGON((${wkt}))')`);
    return this;
  }

  /**
   * Adds a relative time filter using the OData now() function and duration arithmetic.
   * Example: $filter=BridgeModificationTimestamp gt now() sub P1D (last 24 hours)
   * 
   * @param field The timestamp field
   * @param op Comparison operator
   * @param duration ISO 8601 duration string (e.g. 'P1D', 'PT1H')
   */
  relativeTime(field: string, op: 'eq' | 'gt' | 'lt' | 'ge' | 'le', duration: string): this {
    this.conditions.push(`${field} ${op} now() sub ${duration}`);
    return this;
  }

  /**
   * Specialized helper for tracking recently modified records.
   */
  recentlyModified(duration: string): this {
    return this.relativeTime('BridgeModificationTimestamp', 'gt', duration);
  }

  /**
   * Internal formatter for OData values.
   */
  private formatValue(value: string | number | boolean): string {
    if (typeof value === 'string') {
      const escaped = value.replace(/'/g, "''");
      return `'${encodeURIComponent(escaped).replace(/'/g, "%27")}'`;
    }
    return encodeURIComponent(value.toString());
  }

  /**
   * Compiles the conditions into a final $filter string joined by 'and'.
   */
  build(): string {
    if (this.conditions.length === 0) return '';
    return this.conditions.join(' and ');
  }

  /**
   * Static helper for quick filter construction.
   */
  static create(): ODataFilter {
    return new ODataFilter();
  }
}
