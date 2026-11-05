import { z } from 'zod';
import fa from 'zod/v4/locales/fa.js';
import raw from '@/generated/api/contract.json';
z.config(fa());
type Schema = {
  $ref?: string;
  type?: string;
  format?: string;
  nullable?: boolean;
  enum?: string[];
  required?: string[];
  properties?: Record<string, Schema>;
  additionalProperties?: Schema | boolean;
  items?: Schema;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  'x-normalization'?: string;
  'x-normalized-max-length'?: number;
};
export type Operation = {
  path: string;
  method: string;
  parameters: { name: string; in: string; required?: boolean; schema: Schema }[];
  body: Schema | null;
  response: Schema | null;
};
export const contract = raw as unknown as {
  schemas: Record<string, Schema>;
  operations: Operation[];
};
export function resolve(schema: Schema): Schema {
  return schema.$ref ? (contract.schemas[schema.$ref.split('/').pop()!] ?? {}) : schema;
}
const cache = new Map<string, z.ZodType>();
export function validator(input: Schema, utcField = false): z.ZodType {
  if (input.$ref) {
    const key = `${input.$ref}:${utcField}`;
    let v = cache.get(key);
    if (!v) {
      v = z.lazy(() => validator(resolve(input), utcField));
      cache.set(key, v);
    }
    return v;
  }
  let result: z.ZodType = z.unknown();
  if (input.enum) result = z.enum(input.enum as [string, ...string[]]);
  else if (input.type === 'object') {
    const shape: Record<string, z.ZodType> = {};
    for (const [name, s] of Object.entries(input.properties ?? {})) {
      let v = validator(s, name.endsWith('Utc'));
      if (!input.required?.includes(name)) v = v.optional();
      shape[name] = v;
    }
    result =
      input.additionalProperties && typeof input.additionalProperties === 'object'
        ? z.object(shape).catchall(validator(input.additionalProperties))
        : z.object(shape);
  } else if (input.type === 'array') result = z.array(validator(input.items ?? {}));
  else if (input.type === 'string') {
    let v = z.string();
    if (input['x-normalization'] === 'trim') v = v.trim();
    if (input.minLength) v = v.min(input.minLength);
    if (input.maxLength) v = v.max(input.maxLength);
    if (input['x-normalized-max-length'] !== undefined) v = v.max(input['x-normalized-max-length']);
    if (input.pattern) v = v.regex(new RegExp(input.pattern));
    if (input.format === 'byte')
      v = v.regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/);
    result =
      input.format === 'uuid'
        ? // The .NET API also returns canonical non-versioned Guid seed IDs.
          v.guid()
        : input.format === 'date-time'
          ? z.preprocess(
              // SQL-backed .NET DateTime UTC fields can lose their Kind during
              // serialization. Only explicit *Utc fields have this UTC meaning.
              (value) =>
                utcField &&
                typeof value === 'string' &&
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
                  ? `${value}Z`
                  : value,
              v.datetime({ offset: true }),
            )
          : v;
  } else if (input.type === 'integer' || input.type === 'number') {
    let number = input.type === 'integer' ? z.number().int() : z.number();
    if (input.minimum !== undefined) number = number.min(input.minimum);
    if (input.maximum !== undefined) number = number.max(input.maximum);
    result = number;
  } else if (input.type === 'boolean') result = z.boolean();
  return input.nullable ? result.nullable() : result;
}
const matchers = contract.operations.map((o) => ({
  operation: o,
  pattern: new RegExp(
    '^' + o.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{[^}]+\\\}/g, '[^/]+') + '$',
  ),
}));
export function operationFor(method: string, path: string) {
  return matchers.find(
    ({ operation, pattern }) => operation.method === method && pattern.test(path),
  )?.operation;
}
export function operationKey(o: Pick<Operation, 'method' | 'path'>) {
  return `${o.method} ${o.path}`;
}
