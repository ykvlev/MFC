const assert = require('node:assert/strict');

const api = process.env.API_URL ?? 'http://localhost:3000/api/v1';
assert(['localhost', '127.0.0.1'].includes(new URL(api).hostname));

async function request(path, token, method = 'GET', body) {
  const response = await fetch(api + path, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
    },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  assert(response.ok, `${method} ${path}: ${response.status} ${await response.clone().text()}`);
  return response.status === 204 ? undefined : response.json();
}

(async () => {
  const admin = await request('/auth/login', null, 'POST', {
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@university.local',
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  const student = await request('/auth/login', null, 'POST', {
    email: 'student1@student.local', password: 'student12345',
  });
  const types = await request('/application-types', student.accessToken);
  const type = types.find(candidate => !candidate.accessRule && !candidate.usesBooking);
  assert(type, 'No suitable application type');
  const draft = await request('/applications', student.accessToken, 'POST', { typeId: type.id, data: {} });
  const bytes = Buffer.from('%PDF-1.4\nverification\n%%EOF');
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'application/pdf' }), 'verification.pdf');
  const file = await request(`/applications/${draft.id}/files`, student.accessToken, 'POST', form);
  const download = await fetch(`${api}/applications/${draft.id}/files/${file.id}`, {
    headers: { authorization: `Bearer ${student.accessToken}` },
  });
  assert.equal(download.status, 200);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
  await request(`/applications/${draft.id}/files/${file.id}`, student.accessToken, 'DELETE');
  console.log('PASS: real storage upload, byte-exact download, deletion');

  const announcement = await request('/announcements', admin.accessToken, 'POST', {
    title: 'Verification', body: 'Service verification', scope: 'ALL',
  });
  assert(announcement);
  const notifications = await request('/notifications', student.accessToken);
  assert(JSON.stringify(notifications).includes('Service verification'));
  console.log('PASS: announcement creates student notification');

  const window = await request('/slot-windows', admin.accessToken, 'POST', {
    title: 'Verification', date: '2099-10-20', startTime: '10:00', endTime: '11:00',
    slotMinutes: 15, capacity: 1,
  });
  const booking = await request('/slot-bookings', student.accessToken, 'POST', {
    windowId: window.id, slotStart: '10:00',
  });
  const occupied = await request(`/slot-windows/${window.id}/slots`, student.accessToken);
  assert.equal(occupied.slots.find(slot => slot.slotStart === '10:00').free, 0);
  await request(`/slot-bookings/${booking.id}/cancel`, student.accessToken, 'POST');
  const freed = await request(`/slot-windows/${window.id}/slots`, student.accessToken);
  assert.equal(freed.slots.find(slot => slot.slotStart === '10:00').free, 1);
  console.log('PASS: appointment booking, occupancy, cancellation restores availability');
})().catch(error => { console.error(error); process.exitCode = 1; });
