use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};

use walkdir::DirEntry;
use zip::{result::ZipError, write::FileOptions};

/// Extract a ZIP file to a target directory
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

/// Zip a directory's contents into a ZIP file
pub fn zip(
    it: &mut dyn Iterator<Item = DirEntry>,
    prefix: &Path,
    writer: File,
    flat_writing: bool,
) {
    let mut zip = zip::ZipWriter::new(writer);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    let mut buffer = Vec::new();
    for entry in it {
        let path = entry.path();
        let mut name = path.strip_prefix(prefix).unwrap();
        let name_path = PathBuf::from(name.file_name().unwrap());
        if flat_writing {
            name = &name_path;
        }
        let path_as_string = name.to_str().map(str::to_owned).unwrap();

        if path.is_file() {
            zip.start_file(path_as_string, options).unwrap();
            let mut f = File::open(path).unwrap();

            f.read_to_end(&mut buffer).unwrap();
            zip.write_all(&buffer).unwrap();
            buffer.clear();
        } else if !name.as_os_str().is_empty() {
            zip.add_directory(path_as_string, options).unwrap();
        }
    }

    zip.finish().unwrap();
}
