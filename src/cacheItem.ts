export class CacheItem {
  public readonly value: any;
  public readonly ttl: any;
  public get expires(): number {
    return this._expires;
  }
  private _expires: number = 0;
  constructor(
    value: any,
    ttl: number
  ) {
    this.value = value;
    this.ttl = ttl;
    this.extendLifetime();
  }

  public extendLifetime(): void {
    this._expires = Date.now() + this.ttl * 1000;
  }
}
