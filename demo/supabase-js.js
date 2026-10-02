// Stand-in for `@supabase/supabase-js` in local preview mode. Uploaded files
// live as in-memory blob URLs for the life of the tab.
const files = new Map();

export function createClient() {
  return {
    storage: {
      from() {
        return {
          async upload(path, file) {
            await new Promise((r) => setTimeout(r, 500));
            files.set(path, URL.createObjectURL(file));
            return { data: { path }, error: null };
          },
          getPublicUrl(path) {
            return { data: { publicUrl: files.get(path) || `/preview-files/${path}` } };
          },
          async remove(paths) {
            paths.forEach((p) => {
              if (files.has(p)) URL.revokeObjectURL(files.get(p));
              files.delete(p);
            });
            return { data: paths, error: null };
          },
        };
      },
    },
  };
}
