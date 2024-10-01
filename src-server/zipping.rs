use actix_multipart::form::tempfile::TempFile;
use std::fs::{self, File};
use std::io;
use std::path::PathBuf;
use zip::result::ZipError;
use zip::ZipArchive;

/// Extract a ZIP file to a target directory
pub fn extract<T>(mut archive: ZipArchive<T>, target_dir: PathBuf) -> Result<(), ZipError>
where
    T: std::io::Read,
    T: std::io::Seek,
{
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
        dbg!(&target_dir.join(&outpath));
        let mut outfile = fs::File::create(target_dir.clone().join(&outpath)).unwrap();
        dbg!(&outfile);
        io::copy(&mut file, &mut outfile).unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;

            if let Some(mode) = file.unix_mode() {
                let perms = fs::set_permissions(&outpath, fs::Permissions::from_mode(mode));
                match perms {
                    Ok(_) => {}
                    Err(_) => {
                        fs::set_permissions(
                            target_dir.clone().join(&outpath),
                            fs::Permissions::from_mode(mode),
                        )
                        .unwrap();
                    }
                }
            }
        }
    }
    Ok(())
}
