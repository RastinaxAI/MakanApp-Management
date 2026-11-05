import type { components } from '@/generated/api/schema';

export const libraryPermission = 'platform.library.sources.manage';
export type LibrarySource = components['schemas']['EducationalSourceResult'];

export function libraryActionAllowed(source: LibrarySource, method: string, path: string) {
  if (source.scope !== 'Library') return false;
  const capability = path.endsWith('/content')
    ? 'canDownload'
    : path.endsWith('/draft')
      ? 'canWrite'
      : path.endsWith('/versions')
        ? 'canCreateVersion'
        : path.endsWith('/publish')
          ? 'canPublish'
          : path.endsWith('/archive')
            ? 'canArchive'
            : path.endsWith('/visibility')
              ? 'canChangeVisibility'
              : method === 'GET'
                ? 'canRead'
                : null;
  return capability !== null && source.capabilities[capability] === true;
}
