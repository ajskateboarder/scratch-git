use serde_json::{Map, Value};

struct Script<'a> {
    blocks: &'a Map<String, Value>,
    start_id: &'a str,
    depth: i32,
    else_clause: bool,
}

fn some(string: String) -> String {
    if string == "{}" || string == "null" {
        String::new()
    } else {
        string
    }
}

fn parse_script(script: Script) -> Result<String, Box<dyn std::error::Error>> {
    let mut current_id = Some(script.start_id);
    let mut output: String = String::new();

    while let Some(id) = current_id {
        let block = &script.blocks[id];
        if script.else_clause {
            output += &format!("{}else\n", "\t".repeat(script.depth as usize));
        }

        let mut info = format!(
            "{} {} {}",
            some(serde_json::to_string(&block["inputs"])?),
            some(serde_json::to_string(&block["fields"])?),
            some(serde_json::to_string(&block["mutation"])?),
        );

        for key in (&script.blocks).keys() {
            info = info.replace(&format!("\"{key}\""), "\"id\"");
        }

        output += &format!(
            "{}{} {}\n",
            "\t".repeat((script.depth + 1) as usize),
            block["opcode"].as_str().ok_or("no opcode")?,
            info.trim()
        );

        if let Some(condition) = block["inputs"]["CONDITION"].as_array() {
            output = output.trim_end().into();
            output += &parse_script(Script {
                blocks: &script.blocks,
                start_id: condition[1].as_str().ok_or("no condition id")?,
                depth: 0,
                else_clause: false,
            })?;
        }

        if let Some(substack) = block["inputs"]["SUBSTACK"].as_array() {
            if let Some(id) = substack[1].as_str() {
                output += &parse_script(Script {
                    blocks: script.blocks,
                    start_id: id,
                    depth: script.depth + 1,
                    else_clause: false,
                })?;
            }
        }

        if let Some(substack2) = block["inputs"]["SUBSTACK2"].as_array() {
            if let Some(id) = substack2[1].as_str() {
                output += &parse_script(Script {
                    blocks: script.blocks,
                    start_id: id,
                    depth: script.depth + 1,
                    else_clause: true,
                })?;
            }
        }

        current_id = block["next"].as_str();
    }

    Ok(output)
}

pub struct Sprite<'a> {
    pub blocks: &'a Map<String, Value>,
    pub top_ids: Vec<String>,
}

pub fn parse_sprite(sprite: Sprite) -> Result<String, Box<dyn std::error::Error>> {
    let mut output = vec![];
    for id in sprite.top_ids {
        output.push(parse_script(Script {
            blocks: &sprite.blocks,
            start_id: &id,
            depth: -1,
            else_clause: false,
        })?);
    }
    output.sort_by_key(|script| script.to_lowercase());

    Ok(output.join("\n").trim_end().into())
}
