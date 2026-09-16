import os

filepath = 'frontend/src/services/api.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_api = '''
export async function changePassword(data: any): Promise<any> {
  const response = await fetch(${API_URL}/auth/password, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse(response)
}
'''
if 'changePassword' not in content:
    content += new_api
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
