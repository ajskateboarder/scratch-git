use std::fs::{File, self};
use std::path::PathBuf;
use std::io;

use zip::result::ZipError;

pub fn extract(file: File, target_dir: PathBuf) -> Result<(), ZipError> {
    let mut archive = zip::ZipArchive::new(file).unwrap();
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).unwrap();
        let outpath = match file.enclosed_name() {
            Some(path) => path.to_owned(),
            None => continue,
        };
        if let Some(p) = outpath.parent() {
            if !p.exists() {
                fs::create_dir_all(p).unwrap();
            }
        }
        let mut outfile = fs::File::create(target_dir.clone().join(&outpath)).unwrap();
        io::copy(&mut file, &mut outfile).unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
    
            if let Some(mode) = file.unix_mode() {
                fs::set_permissions(&outpath, fs::Permissions::from_mode(mode)).unwrap();
            }
        }
    }
    Ok(())
}
