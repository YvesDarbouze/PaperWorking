import { ODataFilter } from './ODataFilter';

/**
 * 🌉 BridgeQueryBuilder
 * 
 * A utility class for constructing RESO-compliant OData v4 query strings
 * specifically for the Zillow Bridge Interactive API.
 * 
 * Features:
 * - Fluent interface for common OData parameters.
 * - Secure URL encoding for all filter values.
 * - Handles complex filter clustering (logical AND/OR).
 * - Implements default 'StandardStatus eq Active'.
 * 
 * LOGIC GUARDRAIL: $expand is NOT supported for Media. 
 * Bridge API embeds highest resolution media directly in Property records by default.
 */
export class BridgeQueryBuilder {
  private params: Map<string, string> = new Map();
  private filterBuilder: ODataFilter = new ODataFilter();

  /**
   * Disables the default 'StandardStatus eq 'Active'' filter for this query instance.
   */
  ignoreDefaults(): this {
    this.filterBuilder.withoutDefaults();
    return this;
  }

  /**
   * Selects specific fields to return ($select).
   * @param fields Array of field names.
   */
  select(fields: string[]): this {
    this.params.set('$select', fields.join(','));
    return this;
  }

  /**
   * Limits the number of results ($top).
   * @param limit Number of records.
   */
  top(limit: number): this {
    this.params.set('$top', limit.toString());
    return this;
  }

  /**
   * Skips a number of results for pagination ($skip).
   * @param offset Number of records to skip.
   */
  skip(offset: number): this {
    this.params.set('$skip', offset.toString());
    return this;
  }

  /**
   * Orders results by field(s) ($orderby).
   * @param field Field name.
   * @param direction 'asc' or 'desc'.
   */
  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
    const current = this.params.get('$orderby');
    const entry = `${field} ${direction}`;
    this.params.set('$orderby', current ? `${current},${entry}` : entry);
    return this;
  }

  /**
   * Adds a comparison filter ($filter).
   */
  filter(field: string, op: 'eq' | 'gt' | 'lt' | 'ne' | 'ge' | 'le', value: string | number | boolean): this {
    if (op === 'eq') {
      this.filterBuilder.eq(field, value);
    } else if (op === 'gt') {
      this.filterBuilder.gt(field, value);
    } else if (op === 'lt') {
      this.filterBuilder.lt(field, value);
    } else {
      // For operators not yet in ODataFilter, we handle manually but still leverage the builder
      // This is a temporary measure while ODataFilter expands
      (this.filterBuilder as any).conditions.push(`${field} ${op} ${this.formatValue(value)}`);
    }
    return this;
  }

  /**
   * Adds a case-insensitive 'eq' condition using tolower().
   */
  eqIgnoreCase(field: string, value: string): this {
    this.filterBuilder.eqIgnoreCase(field, value);
    return this;
  }

  /**
   * Adds a geospatial distance filter ($filter=geo.distance(Coordinates, POINT(lon lat)) lt radius).
   */
  near(lat: number, lon: number, radiusInMiles: number, field = 'Coordinates'): this {
    this.filterBuilder.near(field, lat, lon, radiusInMiles);
    return this;
  }

  /**
   * Adds simple Web API proximity parameters (near=lon,lat&radius=Nmi).
   * Used for non-OData proximity search on specific Bridge endpoints.
   */
  nearSimple(lat: number, lon: number, radiusInMiles: number): this {
    this.params.set('near', `${lon},${lat}`);
    this.params.set('radius', `${radiusInMiles}mi`);
    return this;
  }

  /**
   * Adds a 'contains' string filter.
   */
  contains(field: string, value: string): this {
    this.filterBuilder.contains(field, value);
    return this;
  }

  /**
   * Adds a 'startswith' string filter for autocomplete.
   */
  startsWith(field: string, value: string): this {
    this.filterBuilder.startsWith(field, value);
    return this;
  }

  /**
   * Adds an 'endswith' string filter for autocomplete.
   */
  endsWith(field: string, value: string): this {
    this.filterBuilder.endsWith(field, value);
    return this;
  }

  /**
   * Adds an OData 'any' collection lambda filter ($filter=Field/any(a: a eq 'value')).
   * Used for fields like Heating, Appliances, etc.
   */
  any(field: string, values: string | string[]): this {
    this.filterBuilder.any(field, values);
    return this;
  }

  /**
   * Adds an OData 'all' collection lambda filter ($filter=Field/all(a: a eq 'value')).
   */
  all(field: string, values: string | string[]): this {
    this.filterBuilder.all(field, values);
    return this;
  }

  /**
   * Date extraction filters (year, month, day).
   */
  year(value: number, field = 'CloseDate', op: 'eq'|'gt'|'lt'|'ge'|'le' = 'eq'): this {
    this.filterBuilder.year(field, op, value);
    return this;
  }

  month(value: number, field = 'CloseDate', op: 'eq'|'gt'|'lt'|'ge'|'le' = 'eq'): this {
    this.filterBuilder.month(field, op, value);
    return this;
  }

  /**
   * High-level financial quarter helper.
   */
  quarter(yearValue: number, q: 1|2|3|4, field = 'CloseDate'): this {
    this.filterBuilder.quarter(field, yearValue, q);
    return this;
  }

  /**
   * Complex geospatial polygon search.
   */
  intersects(points: { lat: number, lon: number }[], field = 'Coordinates'): this {
    this.filterBuilder.intersects(field, points);
    return this;
  }

  /**
   * Expands navigation properties ($expand).
   * LOGIC GUARDRAIL: $expand is NOT supported for Media.
   */
  expand(field: string): this {
    if (field === 'Media') return this;
    if (!this.params.has('$expand')) {
      this.params.set('$expand', field);
    } else {
      const current = this.params.get('$expand');
      this.params.set('$expand', `${current},${field}`);
    }
    return this;
  }

  /**
   * Filters for records modified recently (default 24h).
   * @param duration ISO 8601 duration (e.g. 'P1D', 'PT1H')
   */
  modifiedSince(duration: string): this {
    this.filterBuilder.recentlyModified(duration);
    return this;
  }

  private formatValue(value: string | number | boolean): string {
    if (typeof value === 'string') {
      const escaped = value.replace(/'/g, "''");
      return `'${encodeURIComponent(escaped).replace(/'/g, "%27")}'`;
    }
    return encodeURIComponent(value.toString());
  }

  /**
   * Compiles parameters into a final query string.
   */
  build(): string {
    const filterStr = this.filterBuilder.build();
    if (filterStr) {
      this.params.set('$filter', filterStr);
    }

    // 🛡️ OData v4 Sync Guardrail:
    // If $select is used, expanded fields MUST also be explicitly in the $select list.
    const expandVal = this.params.get('$expand');
    const selectVal = this.params.get('$select');

    if (expandVal && selectVal) {
      const expands = expandVal.split(',');
      const selects = new Set(selectVal.split(','));
      
      let modified = false;
      expands.forEach(field => {
        if (!selects.has(field)) {
          selects.add(field);
          modified = true;
        }
      });

      if (modified) {
        this.params.set('$select', Array.from(selects).join(','));
      }
    }

    const queryParts: string[] = [];
    this.params.forEach((value, key) => {
      queryParts.push(`${key}=${value}`);
    });

    return queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  }
}
