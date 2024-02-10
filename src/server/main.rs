#[macro_use]
extern crate rocket;

mod lib;
use lib::Diff;
use serde_json::{json, to_string_pretty};

// use serde_json::{json, to_string};

// #[get("/hello/<name>/<age>")]
// fn hello(name: &str, age: u8) -> &'static str {
//     let diff = diff_gen::Diff::new(json!({}));
//     "wefniefnw"
// }

// #[launch]
// fn rocket() -> _ {
//     rocket::build().mount("/", routes![hello])
// }

fn main() {
    let diff1 = Diff::new(
        json!({"targets":[{"isStage":true,"name":"Stage","variables":{"`jEk@4|i[#Fk?(8x)AV.-my variable":["my variable",0]},"lists":{},"broadcasts":{},"blocks":{},"comments":{},"currentCostume":0,"costumes":[{"name":"backdrop1","dataFormat":"svg","assetId":"cd21514d0531fdffb22204e0ec5ed84a","md5ext":"cd21514d0531fdffb22204e0ec5ed84a.svg","rotationCenterX":240,"rotationCenterY":180}],"sounds":[],"volume":100,"layerOrder":0,"tempo":60,"videoTransparency":50,"videoState":"on","textToSpeechLanguage":null},{"isStage":false,"name":"Sprite1","variables":{},"lists":{},"broadcasts":{},"blocks":{"a":{"opcode":"event_whenflagclicked","next":"b","parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":213,"y":127},"b":{"opcode":"control_wait","next":null,"parent":"a","inputs":{"DURATION":[1,[5,"1"]]},"fields":{},"shadow":false,"topLevel":false}},"comments":{},"currentCostume":0,"costumes":[{"name":"costume1","bitmapResolution":1,"dataFormat":"svg","assetId":"592bae6f8bb9c8d88401b54ac431f7b6","md5ext":"592bae6f8bb9c8d88401b54ac431f7b6.svg","rotationCenterX":44,"rotationCenterY":44}],"sounds":[],"volume":100,"layerOrder":1,"visible":true,"x":0,"y":0,"size":100,"direction":90,"draggable":false,"rotationStyle":"all around"}],"monitors":[],"extensions":[],"meta":{"semver":"3.0.0","vm":"0.2.0","agent":""}}),
    );
    let diff2 = Diff::new(
        json!({"targets":[{"isStage":true,"name":"Stage","variables":{"`jEk@4|i[#Fk?(8x)AV.-my variable":["my variable",0]},"lists":{},"broadcasts":{},"blocks":{},"comments":{},"currentCostume":0,"costumes":[{"name":"backdrop2","dataFormat":"svg","assetId":"cd21514d0531fdffb22204e0ec5ed84a","md5ext":"cd21514d0531fdffb22204e0ec5ed84a.svg","rotationCenterX":240,"rotationCenterY":180}],"sounds":[],"volume":100,"layerOrder":0,"tempo":60,"videoTransparency":50,"videoState":"on","textToSpeechLanguage":null},{"isStage":false,"name":"Sprite1","variables":{},"lists":{},"broadcasts":{},"blocks":{"a":{"opcode":"event_whenflagclicked","next":null,"parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":117,"y":155}},"comments":{},"currentCostume":0,"costumes":[{"name":"costume2","bitmapResolution":1,"dataFormat":"svg","assetId":"b483ade5237318a7ed6c8ef569584f09","md5ext":"b483ade5237318a7ed6c8ef569584f09.svg","rotationCenterX":77.64330877029343,"rotationCenterY":48.356615919811986}, {"name":"costume2","bitmapResolution":1,"dataFormat":"svg","assetId":"b483ade5237318a7ed6c8ef569584f09","md5ext":"b483ade5237318a7ed6c8ef569584f09.svg","rotationCenterX":77.64330877029343,"rotationCenterY":48.356615919811986}],"sounds":[],"volume":100,"layerOrder":1,"visible":true,"x":0,"y":0,"size":100,"direction":90,"draggable":false,"rotationStyle":"all around"}],"monitors":[],"extensions":[],"meta":{"semver":"3.0.0","vm":"0.2.0","agent":""}}),
    );
    dbg!(diff1.blocks(&diff2));
    dbg!(diff1.commits(diff2));
}
