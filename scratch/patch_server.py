import os

path = r"C:\Users\moshe\Projects\clinic_match\backend\server.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

target = """    const query = `
      SELECT
        m.id AS match_id,
        m.is_closed,
        m.created_at,
        p.id AS profile_id,
        p.name,
        p.position,
        p.required_position,
        p.positions,
        p.location,
        p.role,
        p.avatar_url,
        p.logo_url
      FROM matches m
      JOIN profiles p ON (p.id = m.user_one_id OR p.id = m.user_two_id)
      WHERE (m.user_one_id = $1 OR m.user_two_id = $1)
        AND p.id != $1
      ORDER BY m.created_at DESC
    `;"""

replacement = """    const query = `
      SELECT
        m.id AS match_id,
        m.is_closed,
        m.created_at,
        p.id AS profile_id,
        p.name,
        p.position,
        p.required_position,
        p.positions,
        p.location,
        p.role,
        p.avatar_url,
        p.logo_url,
        rp.stage AS pipeline_stage,
        rp.summary AS pipeline_summary,
        rp.next_step AS pipeline_next_step,
        rp.ai_notes AS pipeline_ai_notes,
        rp.saved_to_talent AS pipeline_saved_to_talent,
        rp.updated_at AS pipeline_updated_at
      FROM matches m
      JOIN profiles p ON (p.id = m.user_one_id OR p.id = m.user_two_id)
      LEFT JOIN recruitment_pipeline rp ON rp.match_id = m.id
      WHERE (m.user_one_id = $1 OR m.user_two_id = $1)
        AND p.id != $1
      ORDER BY m.created_at DESC
    `;"""

# Normalize line endings for replacement
normalized_target = target.replace("\r\n", "\n").strip()
normalized_content = content.replace("\r\n", "\n")

if normalized_target in normalized_content:
    normalized_content = normalized_content.replace(normalized_target, replacement.replace("\r\n", "\n").strip())
    # Save back with original line endings if they were CRLF
    if "\r\n" in content:
        final_content = normalized_content.replace("\n", "\r\n")
    else:
        final_content = normalized_content
    with open(path, "w", encoding="utf-8") as f:
        f.write(final_content)
    print("SUCCESS: server.js patched successfully!")
else:
    # Try a looser match if not found exactly
    print("ERROR: Target query block not found in server.js!")
