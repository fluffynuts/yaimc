export class CacheItem {
  public get expires(): number {
    return this._expires;
  }
  private _expires: number = 0;
  constructor(
    public readonly value: any,
    public readonly ttl: number
  ) {
    this.extendLifetime();
  }

  public extendLifetime(): void {
    this._expires = Date.now() + this.ttl * 1000;
  }
}
