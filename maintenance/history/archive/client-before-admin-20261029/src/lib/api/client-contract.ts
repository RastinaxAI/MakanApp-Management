import raw from '@/generated/api/client-contract.json';
import { validator, type contract, type Operation } from './contract';
export const clientContract = raw as unknown as typeof contract;
export const clientValidator: typeof validator = (input, utcField = false) =>
  validator(input, utcField, clientContract.schemas);
const matchers = clientContract.operations.map((operation) => ({
  operation,
  pattern: new RegExp(
    '^' +
      operation.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{[^}]+\\\}/g, '[^/]+') +
      '$',
  ),
}));
export function clientOperationFor(method: string, path: string): Operation | undefined {
  return matchers.find((item) => item.operation.method === method && item.pattern.test(path))
    ?.operation;
}
