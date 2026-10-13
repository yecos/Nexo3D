// SPDX-License-Identifier: AGPL-3.0-only
// NEXO 3D Desktop: opens the same CAD / Hew / Render interface using Tauri v2.
// The editable scene and GLB stay in local project files, not on our servers.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("No se pudo iniciar NEXO 3D Desktop");
}
