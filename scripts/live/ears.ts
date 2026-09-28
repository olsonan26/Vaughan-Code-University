import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { openRouterChat, KATE_MODELS } from '../../server/ai/providers/openrouter.js';

async function generateAudioFiles() {
  console.log('Generating audio samples using gTTS and ffmpeg...');
  const text = 'Hello, this is a live probe test for Vaughan Code University Ears module. We are verifying qwen3.8-omni-flash audio transcription capability.';
  
  const mp3Path = '/tmp/vcu_sample.mp3';
  const wavPath = '/tmp/vcu_sample.wav';
  
  const pyCmd = `python3 -c "from gtts import gTTS; gTTS('''${text}''').save('${mp3Path}')"`;
  execSync(pyCmd);
  execSync(`ffmpeg -y -i ${mp3Path} ${wavPath} -loglevel error`);
  
  console.log(`Generated short sample: MP3 (${fs.statSync(mp3Path).size} bytes), WAV (${fs.statSync(wavPath).size} bytes)`);
  return { mp3Path, wavPath };
}

function createConcatenatedWav(sourceWav: string, targetDurationMinutes: number, outputPath: string) {
  // Use ffmpeg stream loop / concat to generate N minutes of WAV
  // e.g. -stream_loop N -i sourceWav
  // Approximate loops needed for source (~8s)
  const loops = Math.ceil((targetDurationMinutes * 60) / 8);
  execSync(`ffmpeg -y -stream_loop ${loops} -i ${sourceWav} -t ${targetDurationMinutes * 60} ${outputPath} -loglevel error`);
  const size = fs.statSync(outputPath).size;
  console.log(`Created ${targetDurationMinutes} min WAV (${outputPath}): ${size} bytes (${(size / (1024 * 1024)).toFixed(2)} MB)`);
  return outputPath;
}

async function probeAudio(filePath: string, format: 'wav' | 'mp3', label: string) {
  const buf = fs.readFileSync(filePath);
  const base64 = buf.toString('base64');
  console.log(`\n--- Probing ${label} (${format.toUpperCase()}, ${buf.length} bytes, base64: ${base64.length} chars) ---`);
  
  const start = Date.now();
  try {
    const res = await openRouterChat({
      model: KATE_MODELS.ears,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Please transcribe the following audio verbatim.' },
            {
              type: 'input_audio',
              input_audio: {
                data: base64,
                format,
              },
            },
          ],
        },
      ],
      maxTokens: 2000,
    });
    const elapsed = Date.now() - start;
    console.log(`SUCCESS (${elapsed}ms):`);
    console.log(`Transcript: "${res.text.trim()}"`);
    console.log(`Cost: $${res.costUsd ?? 'unknown'} | Tokens: in=${res.usage.inputTokens}, out=${res.usage.outputTokens}`);
    return { success: true, text: res.text, costUsd: res.costUsd, usage: res.usage, elapsed, sizeBytes: buf.length };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    console.error(`FAILED (${elapsed}ms):`, err.message || err);
    return { success: false, error: err.message || String(err), elapsed, sizeBytes: buf.length };
  }
}

async function main() {
  console.log('=== VCU EARS LIVE PROBE ===');
  console.log(`Model: ${KATE_MODELS.ears}`);
  
  const { mp3Path, wavPath } = await generateAudioFiles();

  // Test 1: Short WAV vs MP3
  const shortWavRes = await probeAudio(wavPath, 'wav', 'Short sample (~8s)');
  const shortMp3Res = await probeAudio(mp3Path, 'mp3', 'Short sample (~8s)');

  // Test 2: Probe limits (1 min, 5 min, 10 min)
  console.log('\n=== PROBING DURATION / SIZE LIMITS ===');
  const wav1m = createConcatenatedWav(wavPath, 1, '/tmp/vcu_1m.wav');
  const res1m = await probeAudio(wav1m, 'wav', '1 minute WAV');

  const wav5m = createConcatenatedWav(wavPath, 5, '/tmp/vcu_5m.wav');
  const res5m = await probeAudio(wav5m, 'wav', '5 minute WAV');

  const wav10m = createConcatenatedWav(wavPath, 10, '/tmp/vcu_10m.wav');
  const res10m = await probeAudio(wav10m, 'wav', '10 minute WAV');

  console.log('\n=== SUMMARY OF LIVE PROBE RESULTS ===');
  console.log('Short WAV:', shortWavRes.success ? 'PASSED' : 'FAILED');
  console.log('Short MP3:', shortMp3Res.success ? 'PASSED' : 'FAILED');
  console.log('1 min WAV:', res1m.success ? 'PASSED' : 'FAILED');
  console.log('5 min WAV:', res5m.success ? 'PASSED' : 'FAILED');
  console.log('10 min WAV:', res10m.success ? 'PASSED' : 'FAILED');
}

main().catch(err => {
  console.error('Probe error:', err);
  process.exit(1);
});
