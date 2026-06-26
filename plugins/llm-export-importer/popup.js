const API_URL = 'http://localhost:4000';
document.getElementById('send').onclick = async () => {
  const token = document.getElementById('token').value.trim();
  const sourceType = document.getElementById('source').value;
  const payload = document.getElementById('payload').value;
  const res = await fetch(`${API_URL}/api/imports/llm`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ sourceType, payload }) });
  document.getElementById('out').textContent = JSON.stringify(await res.json(), null, 2);
};
