import { Client } from "@gradio/client";

const response_0 = await fetch(
  "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png"
);
const exampleImage = await response_0.blob();

const client = await Client.connect("http://127.0.0.1:7860/");
const result = await client.predict("/process", {
  input_image: exampleImage,
  prompt: "Hello!!",
  n_prompt: "Hello!!",
  seed: 3,
  total_second_length: 1,
  latent_window_size: 1,
  steps: 1,
  cfg: 1,
  gs: 1,
  rs: 0,
  gpu_memory_preservation: 6,
  use_teacache: true,
  mp4_crf: 0,
});

console.log(result.data);
