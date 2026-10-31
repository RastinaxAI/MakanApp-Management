// A public, non-sensitive identity probe keeps deployment checks from accepting
// another MakanApp service just because its login page also returns HTTP 200.
export function GET() {
  return Response.json(
    { application: 'makan-management-panel', status: 'ok' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
