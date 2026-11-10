/** A repository-relative JSON reader; native applications can inject their bundled reader. */
export async function readRepositoryJSON(path) {
  if(typeof path!=='string'||path.includes('..')||path.startsWith('/'))throw new TypeError('Expected a repository-relative data path');
  const url=new URL('../'+path,import.meta.url);
  if(url.protocol==='file:'){
    const fs=await import(/* @vite-ignore */ 'node:fs/promises');
    return JSON.parse(await fs.readFile(url,'utf8'));
  }
  const response=await fetch(url);
  if(!response.ok)throw new Error(`Cannot load ${path}: ${response.status}`);
  return response.json();
}
