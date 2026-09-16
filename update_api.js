import * as fs from 'fs';

let content = fs.readFileSync('frontend/src/services/api.ts', 'utf8');

const newApiCall = 
export async function changePassword(data: any): Promise<any> {
  const response = await fetch(\\/auth/password\, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse(response)
}
;

if (!content.includes('changePassword')) {
    content += newApiCall;
    fs.writeFileSync('frontend/src/services/api.ts', content);
}
