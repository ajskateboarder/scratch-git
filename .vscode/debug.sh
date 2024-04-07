killall turbowarp-desktop
killall scratch-git
cargo build
./target/debug/scratch-git --debug &
/opt/TurboWarp/turbowarp-desktop >/dev/null