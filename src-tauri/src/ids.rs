// IDs im cuid-Format (kompatibel zu den von Prisma erzeugten IDs — beides
// sind opake Strings; bestehende IDs aus einer migrierten DB bleiben gültig).
pub fn new_id() -> String {
    cuid2::create_id()
}
