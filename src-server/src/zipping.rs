use std::fs;
use std::io;
use std::path::PathBuf;
use anyhow::{anyhow,Error};
use zip::ZipArchive;

/// Extract a ZIP file to a target directory
pub fn extract<T>(mut archive: ZipArchive<T>, target_dir: PathBuf, max_size: u64) -> Result<(), Error>
where
    T: std::io::Read,
    T: std::io::Seek,
{
    let mut size: u64 = 0;
    for i in 0..archive.len() {
        size += archive.by_index(i).unwrap().size()
    }
    if size > max_size {
        return Err(anyhow!("this is most certainly a zip bomb"))
    }

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).unwrap();
        let outpath = match file.enclosed_name() {
            Some(path) => path.to_owned(),
            None => continue,
        };
        let mut outfile = fs::File::create(target_dir.clone().join(&outpath)).unwrap();
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
