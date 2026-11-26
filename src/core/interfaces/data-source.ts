export interface IDataSource {
  /**
   * Checks if a data source exists for the given key.
   * Key typically maps to a filename (e.g., 'insight.bin', 'GeoLite2-City.mmdb').
   */
  has(key: string): Promise<boolean>;

  /**
   * Loads the data as a Uint8Array.
   * Returns null if not found or empty.
   */
  load(key: string): Promise<Uint8Array | null>;
}
