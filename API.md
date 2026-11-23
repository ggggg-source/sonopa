# Sonopa API Documentation

## Base URL
`https://<your-domain>/api`

## Authentication
All endpoints require Supabase Auth. Two modes:

- **Web (cookie session):** browser client with `@supabase/ssr` — cookies sent automatically.
- **Mobile (Bearer token):** `Authorization: Bearer <supabase_access_token>`
  obtained via `supabase.auth.signInWithPassword()` / OAuth in the app.

## Response Format
```json
{ "success": true, "data": { ... }, "error": null }
{ "success": false, "data": null, "error": "message" }
```

HTTP statuses: 200 GET/PUT, 201 POST, 400 validation, 401 unauthorized, 403 forbidden, 404 not found, 409 conflict, 500 server error.

CORS: `Access-Control-Allow-Origin: *` on all `/api/*` routes.

## Pagination
List endpoints accept `?limit=` (default 20, max 100) and `?offset=` (default 0).
Responses include `{ items, total, limit, offset }` for infinite scroll.

## Endpoints

### Reposts
- `GET /reposts?userId=<uuid>&limit=20&offset=0` → `{ reposts, total, limit, offset }`
- `POST /reposts` body `{ type: "track"|"playlist", youtubeId?, playlistId?, title, artist?, cover? }` → `{ repost }` (201; 409 if already reposted)
- `DELETE /reposts?id=<uuid>` → `{ deleted: true }`

### Friends
- `GET /friends?userId=<uuid>&status=accepted|pending&limit&offset` → `{ friends, total, limit, offset }`
- `POST /friends` body `{ friendId: <uuid>, friendName?, friendEmail? }` → `{ friendship }` (201; 409 duplicate; 400 self-add)
- `PUT /friends` body `{ id: <uuid>, status: "accepted"|"rejected" }` → `{ updated: true }` (recipient only)
- `DELETE /friends?friendId=<uuid>` → `{ deleted: true }` (removes friendship both ways)
- `GET /friends/requests` → `{ requests }` (incoming pending)
- `GET /friends/suggestions` → `{ suggestions }` (profiles not yet in friends/requests)

### Users
- `GET /users/:id` → `{ user: { id, email, name }, stats: { reposts, friends, likes } }` (public)

### Existing (library sync)
- `GET|POST|DELETE /api/user/likes`
- `GET|POST|DELETE /api/user/playlists`
- `GET|POST /api/user/history`
- `GET /api/charts?region=&type=&source=`
- `GET /api/search?q=&region=`
- `GET|POST /api/recommendations`
- `GET /api/lyrics?artist=&title=`
- `GET /api/stats` (dev only)

## Supabase tables required
`profiles`, `reposts`, `friends`, `user_likes`, `user_playlists`, `playlist_tracks`, `user_history` — see SQL in project docs / chat.
