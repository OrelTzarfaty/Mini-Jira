import { useParams } from 'react-router';

/**
 * Reads a URL parameter that the matched route always has, such as :projectKey.
 * A missing parameter means the route table is wrong, so it fails loudly.
 */
export function useRouteParam(name: string): string {
  const value = useParams()[name];

  if (value === undefined) {
    throw new Error(`The current route has no :${name} parameter`);
  }

  return value;
}
