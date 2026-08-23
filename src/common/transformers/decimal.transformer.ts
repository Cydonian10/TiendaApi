// src/common/transformers/decimal.transformer.ts
import { ValueTransformer } from 'typeorm';

export class DecimalTransformer implements ValueTransformer {
  to(value?: number | null): string | null {
    return value == null ? null : value.toFixed(2);
  }
  from(value?: string | null): number | null {
    return value == null ? null : Number(value);
  }
}
