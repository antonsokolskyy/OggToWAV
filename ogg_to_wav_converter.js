// converts ogg(Opus) to WAV(16 bit)
export class OggToWav {
  constructor(file) {
    this.file = file;
  }

  // Convert to WAV
  async toWav() {
    // Read the WAV file
    const fileData = await this.readFile();
    // Decode the WAV file
    const audioBuffer = await this.decodeWav(fileData);
    // Convert the audio buffer to a WAV file buffer
    const wavBuffer = this.createWavBuffer(audioBuffer);
    // Save the WAV file buffer as a file
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  // resample a WAV file
  async resampleWav(outputSampleRate) {
    // Read the WAV file
    const fileData = await this.readFile();
    // Decode the WAV file
    const audioBuffer = await this.decodeWav(fileData);
    // Resample the audio data
    const resampledAudioBuffer = await this.resampleAudio(audioBuffer, outputSampleRate);
    // Convert the resampled audio buffer to a WAV file buffer
    const wavBuffer = this.createWavBuffer(resampledAudioBuffer);
    // Save the WAV file buffer as a file
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  // read a file as ArrayBuffer
  readFile() {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsArrayBuffer(this.file);
    });
  }

  // decode a WAV file
  decodeWav(fileData) {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContext.decodeAudioData(fileData, resolve, reject);
    });
  }

  async resampleAudio(audioBuffer, outputSampleRate) {
    return new Promise((resolve) => {
      // Calculate the resampling ratio by dividing the original sample rate
      // by the desired output sample rate.
      const ratio = audioBuffer.sampleRate / outputSampleRate;
      // Extract the audio data from the first channel of the input buffer.
      const inputBuffer = audioBuffer.getChannelData(0);
      // Calculate the length of the output buffer based on the resampling ratio.
      const outputLength = Math.floor(inputBuffer.length / ratio);
      const outputBuffer = new Float32Array(outputLength);
      // Iterate over each sample in the output buffer.
      // For each output sample, calculate its corresponding index in the input buffer
      // using the resampling ratio.
      // Perform linear interpolation between adjacent samples in the input buffer
      // to compute the resampled output sample.
      for (let i = 0; i < outputLength; i++) {
        const index = i * ratio;
        const leftIndex = Math.floor(index);
        const frac = index - leftIndex;
        let sum = 0;
        for (let j = 0; j < 2; j++) {
          const sourceIndex = leftIndex + j;
          if (sourceIndex >= 0 && sourceIndex < inputBuffer.length) {
            sum += (1 - Math.abs(j - frac)) * inputBuffer[sourceIndex];
          }
        }
        outputBuffer[i] = sum;
      }
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // Create a new audio buffer with the resampled audio data.
      // The resampled buffer has one channel, the length determined earlier,
      // and the specified output sample rate.
      const resampledAudioBuffer = audioContext.createBuffer(1, outputLength, outputSampleRate);
      resampledAudioBuffer.copyToChannel(outputBuffer, 0);
      resolve(resampledAudioBuffer);
    });
  }

  createWavBuffer(decodedData) {
    const numberOfChannels = decodedData.numberOfChannels;
    const sampleRate = decodedData.sampleRate;
    // * 2 means 16 bit, each sample is represented by 2 bytes (16 bits)
    const length = decodedData.length * numberOfChannels * 2;
    // The WAV file format specifies a 44-byte header that contains information about the audio data
    const wavBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(wavBuffer);

    // Write WAV header
    // Writes the RIFF (Resource Interchange File Format) identifier at the beginning of the WAV file
    this.writeString(view, 0, 'RIFF');
    // Sets the size of the entire file in bytes, excluding the first 8 bytes which contain
    // the RIFF identifier and the file size itself.
    // 36 here is the size of the fixed part of the header (44 - 8)
    view.setUint32(4, 36 + length, true);
    // Writes the WAVE identifier, indicating that the file is in WAV format.
    this.writeString(view, 8, 'WAVE');
    // Writes the 'fmt ' subchunk identifier, indicating the start of the format chunk.
    this.writeString(view, 12, 'fmt ');
    // Sets the size of the format chunk (excluding the first 8 bytes of the format chunk itself)
    // to 16 bytes, which is the size of the PCM format chunk.
    view.setUint32(16, 16, true);
    // Sets the audio format to PCM (Pulse Code Modulation)
    view.setUint16(20, 1, true);
    // Sets the number of audio channels
    view.setUint16(22, numberOfChannels, true);
    // Sets the sample rate of the audio data,
    // indicating how many samples per second are taken from the audio signal.
    view.setUint32(24, sampleRate, true);
    // Sets the byte rate, which is the number of bytes per second in the audio data.
    // It is calculated as the sample rate multiplied by the number of channels
    // multiplied by the number of bytes per sample (2 bytes for 16-bit audio).
    view.setUint32(28, sampleRate * 2 * numberOfChannels, true);
    // Sets the block align, which is the number of bytes for each block of audio data.
    // It is calculated as the number of channels multiplied by the number of bytes
    // per sample (2 bytes for 16-bit audio).
    view.setUint16(32, 2 * numberOfChannels, true);
    // Sets the number of bits per sample. For PCM audio, this is typically 16 bits.
    view.setUint16(34, 16, true);
    // Writes the 'data' subchunk identifier, indicating the start of the data chunk.
    this.writeString(view, 36, 'data');
    // Sets the size of the audio data chunk (excluding the first 8 bytes of the data chunk itself)
    // to the total size of the audio data payload in bytes.
    view.setUint32(40, length, true);


    // Copy audio data to WAV buffer
    // creates a new DataView object, starting at byte offset 44 of the wavBuffer.
    // This offset is where the audio data payload begins, after the 44-byte WAV header.
    const dataView = new DataView(wavBuffer, 44);
    // iterates over each audio channel
    for (let channel = 0; channel < numberOfChannels; channel++) {
      // retrieves the audio data for the current channel
      const channelData = decodedData.getChannelData(channel);
      // This nested loop iterates over each sample in the audio data for the current channel.
      for (let i = 0; i < channelData.length; i++) {
        // This calculates the byte offset within the DataView buffer
        // where the current sample should be written.
        // Since each sample is represented by a 16-bit integer (2 bytes)
        // and there are multiple channels, we need to adjust the offset accordingly.
        const offset = i * 2 * numberOfChannels + channel * 2;
        // This ensures that the sample value is within the range of -1 to 1.
        // This is necessary because the WAV format uses signed 16-bit integers
        // to represent sample values, which range from -32768 to 32767.
        // Values outside this range will be clipped.
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        // This writes the sample value to the DataView buffer as a
        // 16-bit signed integer (little-endian).
        // The ternary operator (sample < 0 ? sample * 0x8000 : sample * 0x7FFF)
        // converts the sample value to the appropriate signed 16-bit integer representation
        // based on its sign. The third argument "true" specifies little-endian byte order.
        dataView.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      }
    }

    return wavBuffer;
  }

  // writes a string into a DataView object at a specified offset
  // The function iterates over each character in the input string,
  // converts the character to its Unicode code point,
  // and then writes the code point as an 8-bit unsigned integer (Uint8)
  // to the DataView at the specified offset plus the current iteration index i.
  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
