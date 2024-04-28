# OggToWAV Converter

Simple class that allows to convert/resample `audio/ogg; codecs=opus` from `mediaRecorder` to WAV on client side.  

Takes a file or a blob as input and responds with a blob.  

# Example
```javascript
oggToWav = new OggToWav(file);

// convert to WAV
blob = await oggToWav.toWav();
// or convert and resample to given sample rate
blob = await oggToWav.resampleWav(16000);
```

```html
<body>
  <input type="file" id="audioFile" accept="audio/ogg; codecs=opus">
  <button id="button">Convert to WAV</button>

  <script type="module">
    import { OggToWav } from 'ogg_to_wav_converter';

    document.querySelector('#button').addEventListener('click', convertToWav);

    async function convertToWav() {
      const audioFileInput = document.getElementById('audioFile');
      const file = audioFileInput.files[0];

      const oggToWav = new OggToWav(file);

      // convert to WAV
      const blob = await oggToWav.toWav();
      // or convert and resample to given sample rate
      const blob = await oggToWav.resampleWav(16000);
    }
  </script>
</body>
```

```javascript
mediaRecorder.ondataavailable = async (e) => {
  // convert chunks to WAV and submit
  // each new submit gets larger WAV file
  chunks.push(e.data);
  let blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
  const oggToWav = new OggToWav(blob);
  this.submitBlob(await oggToWav.resampleWav(16000));
};
```
`chunks` variable is not getting cleared for a reason :)