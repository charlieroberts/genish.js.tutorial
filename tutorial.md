`genish.js` is basically a compiler; it takes JavaScript defining a synthesis algorithm and creates an optimized version of it. It uses many tricks to optimize, such as managing its own memory for faster de-referencing and baking data into the callback whenever possible to avoid de-referencing altogether. Most importantly, it is optimized for *per-sample* processing, enabling a variety of forms of synthesis that aren't possible using the audio API included in browsers. The major tradeoff with per-sample processing is efficiency, which is why an optimized library like `genish.js` becomes necessary.

In the world of digital audio, audio signals are expected to contain a certain number of values per second; these values are often called *samples* and the number of samples per second contained in a signal is known as the *sampling frequency*[^circles-sines-signals]. Most of our work in `genish.js` will be creating objects called *unit generators*, a term coined by Max Mathews for his language *Music V* [^unit-generators]. In `genish.js` unit generators (aka ugens)will output samples one at a time at a rate equal to the sample frequency. By chaining unit generators together we can create complex synthesis objects.

This tutorial handles some of the gruntwork of getting an audio callback in browser for you, and also provides a convenience method, `play()`, that automatically turns a graph of ugens into an audio callback and starts it playing. In this way it's similar to the `genish.js` playground](http://www.charlie-roberts.com/genish/playground/). Towards the end the tutorial will cover how to use `genish.js` outside the tutorial / playgournd in your own projects.

### <a id="start">A simple start: make a number get bigger with accum()</a>

One of the simplest ugens in `genish.js` is the *accumulator*, or `accum()`; this ugen simply increments an internal value. `acuum` accepts two *inputs* that can be freely changed at audio-rate: the first is the increment amount, and the second is a flag that the internal value should be reset. We can test this in the `genish.js` playground as follows:

```jsmirror
callback = gen.createCallback(
  accum( .1, 0 )
)

// output values adjusted here for floating-point error
flash( callback() ) // >>  0
flash( callback() ) // >> .1
flash( callback() ) // >> .2 etc.
```

The `gen.createCallback` method accepts a ugen ( which may contain references to many other ugens... in this case we call it a *graph*, where each ugen is a *node*) and returns a function that can be executed. When we call that function above, we see a number that gradually increases by .1. However, if you execute the callback more than ten times, you'll notice that it wraps down to `0`. The `accum` ugen has `min` and `max` properties that can be set only on initialization[^counter]; by default these wrap the internally stored value to a range of {0,1}. To change these properties, we can pass a dictionary of properties as our third argument to `accum`.

```jsmirror
callback = gen.createCallback(
  accum( .75, 0, { min:-1, max:1 } )
)

// outputs values adjust for floating-point error
flash( callback() ) // >>  -1
flash( callback() ) // >> -.25
flash( callback() ) // >>  .5
flash( callback() ) // wraps to >> -.75
```

### <a id="noise">Making some noise</a>

Synthesis algorithms producing musical sound typically create repeating (or *periodic*) signals; non-periodic signals often are perceived as noisy. The number of times per second that a given signal repeats determines its *frequency*, which roughly corresponds perceptually to the pitch of a sound. One type of unit generator that easily generates a repeating signal is our previously mentioned *accumulator*, which increments a value until it reaches a certain specified maximum, at which point the value loops back to its specified minimum and the process starts all over again. By default, accumulators in `genish.js` loop between {0,1}.

Let's assume we want to create a unit generator running at 440 Hz, the traditional tuning frequency used by Western orchestras. If we want our accumulator to repeat moving between {0,1} 440 times per second, first we need to know how many samples per second our audio signal is operating at. We can access this using `gen.samplerate`. On most systems this will return a value of `44100`, the sampling-rate used for CD quality audio, but if you have an audio interface connected to your computer you might get a higher value.

Now that we know the sampling rate and the frequency we want to use for our unit generator, we can easily figure out how much our accumulator should increment its internal value per sample: `440 / gen.samplerate`. In the `genish.js` playground we can create an accumulator and run it as follows:

```jsmirroraudio
play(
  accum( 440 / gen.samplerate )
)
```

With a typical sampling rate of 44100 Hz, our `accum` will increment ~0.009977 per sample (440 / 44100). Highlight the code and hit Ctrl+Enter to run it. The `play()` function is specific to the playground and accepts one argument, a unit generator that it will use to render audio samples to your computer's digital-to-analog converter (DAC). Let's replace our number with a variable, `frequency`.

```jsmirroraudio
frequency = 330
play(
  accum( frequency / gen.samplerate )
)
```

Try changing the value of `frequency` and re-executing the code. Note that higher values result in higher pitches and vice-versa. Also note that whenever you re-run a call to `play()`, the existing audio is terminated and replaced with the output of the new unit generator that is created.

It turns out that creating a line between two values and specifying its frequency is a pretty common task in audio synthesis. There's a dedicated unit generator for this, the *phasor*. The following two lines of code are almost equivalent in `genish.js`:

```javascript
ramp = accum( 440 / gen.samplerate )
ramp = phasor( 440 )
```

The one significant difference is that, by default, `accum` outputs values in the range of {0,1} while `phasor` outputs a full-range audio signal of {-1,1}. `phasor` is basically a sawtooth oscillator, one of the most common oscillators used in subtractive synthesis. We can also easily generate a "reverse sawtooth":

```jsmirroraudio
play( mul( -1, phasor( 440 ) )
```

An oscillator signal in reverse sounds more or less identical to their forward counterpart when driven at higher frequencies; however, they can produce dramatic differences when used to modulate other oscillators at lower frequencies, as we'll see shortly.

### <a id='sines'>Sine waves</a>

While the humble ramps created using `accum` are very important in synthesis, nothing is more important than sinewaves. They form the basis for many forms of synthesis (classical FM and additive to name two) and are also important in audio analysis. Part of their power comes from the fact that, ideally, they contain only one fundamental frequency. In our previous sawtooth example, the base frequency was present but so were many, many overtones... multiples of the oscillators base frequency that give the sawtooth oscillator its distinctly brassy sound. Sine osillcators sound pure in comparison.

Creating a sine oscillator using genish is simple:

```jsmirroraudio
play( cycle( 440 ) )
```

The `cycle` ugen creates a sine wave by looking up values in a table (included in genish.js) and interpolating between them. By pre-calculating and storing a single cycle of a sinewave, we can avoid having to calculate waveforms in realtime and simply change the speed that we read the table to vary its fundamental frequency (this is commonly known as *wavetable* synthesis). However, if we know a little bit about the formula for a sinewave[^sine], we can also create one using ugens found in genish.js: 

```jsmirroraudio
play( 
  sin( 
    mul( phasor( 440 ), Math.PI * 2 )
  )
)
```

The `sin()` ugen simply calculates the trigonometric sin of a number using JavaScript's built-in `Math.sin` function. In this case we multiply a phasor by 2PI, calculate the sin of the result, and we've created a sine oscillator from "scratch" in gen. But since it's faster to use the lookup table of `cycle` (not to mention much quicker to type) we'll use that for the rest of the examples.

### <a id='modulation'>Modulation and interaction (aka make a "theremin")</a>

Let's do some basic modulation using sinewaves. *Modulation* can be simply thought of as using one signal to change the output of another. In this case we'll perform *frequency modulation* to create *vibrato* in an oscillator. Vibrato is regular fluctuations in the frequency of a sound (often heard in singing) in contrast to *tremolo*, which is fluctuations in loudness

In the example below, we'll first create a sine oscillator with a range of {-20,20} by wrapping a call to `cycle` in a `mul`. This will be our modulator; we'll use it to fluctuate our carrier frequency by +/- 20 Hz. Then we'll create a second `cycle` ugen that will add our modulation to a base frequency of 440 Hz, creating our vibrato.

```jsmirroraudio
modulator = mul( cycle( 4 ), 20 )
carrier = cycle( add( 440, modulator ) )

play( carrier )
```

OK, great. Now let's add some interaction so that we can control both the base frequency and the depth of the modulation. We'll do this using the `param()` ugen, which enables you to directly manipulate a number stored in the memory of any callbacks generated by genish by accessing a `.value` property. In the example below, `genish` only requires a single `Float32` of memory, which will wind up being indexed at `gen.memory.heap[0]`; if we had other ugens running these would be using memory indexed at other parts of the heap. Having a single Float32Array used for memory during audio callbacks is one of the big performance wins of genish.js.

```jsmirror
myparam = param( 440 )
callback = gen.createCallback( myparam )

flash( gen.memory.heap[0] ) // >> 440
myparam.value = 880
flash( gen.memory.heap[0] ) // >> 880
```

The important element of `param` is that it removes the need for you, the developer, to worry about the location of the memory in the heap. You simply change the `.value` property and this is done fo ryou behind the scenes.

With that said, we can setup some interaction that simply looks at the position of our mouse cursor:

```jsmirroraudio
carrierFrequency = param( 440 )
modulationDepth  = param( 15 )

modulator = mul( cycle(4), modulationDepth )
modulatedFrequency = add( carrierFrequency, modulator )

play( cycle( modulatedFrequency ) )

window.onmousemove = function( e ) { 
  let percentY = e.clientY / window.innerHeight,
      percentX = e.clientX / window.innerWidth
  
  // get a frequency range of {110,990}
  carrierFrequency.value = 990 - (percentY * 880)
  modulationDepth.value  = percentX * 100
}
```

### <a id='modulation'>FM (Frequency Modulation) Synthesis</a>

When we use frequency modulation with high-frequency, high-amplitude signals interesting sonic results can occur. John Chowning codified how a range of musically complex sounds could be created with just a pair of sine oscillators. His technique, named FM synthesis, was responsible for the best-selling hardware synthesizer of all time, the Yamaha DX-7, heard on countless records in the 80s and beyond.

There are a couple of simple tricks in FM synthesis. When describing them, the term *carrier* refers to a oscillator that uses a base frequency corresponding to the pitch we want to generate, while the term *modulator* refers to an oscillator that is modulating the carrier in a way that the pitch (typically) remains the same, but creates interesting timbral results.

1. A fixed ratio should govern the relationship between carrier and modulation frequencies; let's call this the *carrier-to-modulation ratio* or *c2m*. For example, if our c2m is `2` and our carrier is using a base frequency of `440 Hz`, our modulator should then have a frequency of 880Hz. Maintaining this frequency relationship is what provides a consistent timbre to the sounds genered by FM synthesis across pitches.

2. The amplitude of the modulator is also governed by the frequency of the carrier using a ratio named the *index*. This is another key to FM synthesis: using modulators with extremely high amplitudes that windup creating (potentially) large number of sideband frequencies when modulating the carrier. If the index of our FM recipe is `4`, and our carrier frequency is again `440`, then the amplitude of the modulator winds up being `1760` (much louder than 11).

Given these two simple rules, let's make a simple gong sound in genish.js. A classic FM gong recipe is to use a c2m value of `1.4` and a index value of `.95`. We'll need to create two cycle objects, set the frequency and amplitude of the modulator to track the frequency of the carrier, and then apply an amplitude envelope to get a decaying gong sound.

```jsmirroraudio
baseFrequency = 80
c2m = 1.4
index = .95

// create our oscillator for modulation
modulator = cycle( mul( baseFrequency, c2m ) )

// scale amplitude based on index value, re-assign
modulator = mul( modulator, mul( baseFrequency, index ) )

// create carrier oscillator and modulate frequency
carrier = cycle( add( baseFrequency, modulator ) )

// create an exponential decay lasting eight seconds
env = decay( gen.samplerate * 8 )

// multiply carrier output by envelope and play
play( mul( carrier, env ) )
```

### <a id='modulation'>Single-Sample Feedback</a>

One of the advantages of genish.js over other JavaScript libraries is that you can easily perform single-sample feedback. This means you can, for example, calculate the output of a `cycle` ugen, and then use that output to modulate its frequency when the next sample is calculated. This is in contrast to *block-based processing*, where each ugen processes many samples at a time for efficiency reasons, eliminating the ability to render an entire audio graph on a sample-by-sample basis.

Let's take a look at using feedback to modulate `cycle`. We will use the *single-sample delay* ugen, or `ssd`, to store each sample and then report it back. In a way the `ssd` ugen is actually two ugens wrapped in one: the `ssd.in()` ugen records a sample while the `ssd.out` ugen returns the last recorded sample. With that in mind, here's some simple feedback:

```jsmirroraudio
// initialize history to 0
sample = ssd( 0 )

// use last sample to drive modulation
modulation = mul( sample.out, 300 )

// base cycle frequency on modulation
osc = cycle( add( 440, modulation ) )

// record cycle output for next use in sample
sample.in( osc )

play( osc )
```

The results in the above example aren't particularly exciting, but you'll probably here that the resulting timbre is more complex than that of a simple sine oscillator. However, feedback is a critical component of FM synthesis. If you look at a chart showing [the thirty-two routing possibilities of the DX7](https://www.yamahasynth.com/forum?controller=attachment&task=displayFile&tmpl=component&id=376)(called *algorithms* by Yamaha) you'll note that every one contains a single-sample feedback path. 

### <a id='delayLine'>Creating a delay line</a>

The ability to single-sample feedback means you can create complicated feedback networks using genish.js. The core component of a feedback network is the *delay line*, which uses a `delay` ugen to delay an input signal by an specified number of samples; the output of the delay can then be feed back into itself to create a series of echos. In the example below, we'll create a series of random pitches played at random times using the `noise()` and `sah()` ugens. `noise` simply returns a random number between {0,1} using JavaScripts `Math.random` function. The `sah` ugen (which stands for sample-and-hold) accepts three arguments: first, an input signal; second, a control signal that can trigger sampling; and third, a threshold that the control signal must cross for sampling to occur. So, our first line will be:

`frequencyControl = sah( add( 220, mul( noise(),880 ) ), noise(), .99995 )`

... which basically translates to 'pick a new frequency between 220 and 1100 every time a noise signal goes above .99995'. 

```jsmirroraudio
// use noise with sample-and-hold to output random frequencies with random timing
frequencyControl = sah( add( 220, mul( noise(),880 ) ), noise(), .99995 )
 
// create an oscillator and scale its output
osc = mul( cycle( frequencyControl ), .025 )
 
// create a single-sample delay
feedback = ssd()
 
// feed our oscillator and our ssd into a delay with a delay time of 11025 samples
echo = delay( add( osc, feedback.out ), 11025 )

// control feedback by attenuating echoes
feedback.in( mul( echo, .5 ) )
 
play( echo )
```	
 
[^counter]: For a ugen supporting audio-rate modulation of `min` and `max` properties, see [the counter ugen](http://www.charlie-roberts.com/genish/docs/index.html#integrator-counter)

[^unit-generators]:http://cs.au.dk/~dsound/DigitalAudio.dir/Papers/MaxMathews.pdf

[^circles-sines-signals]: For more information on sampling frequency, see [this incredibly excellent tutorial.](http://jackschaedler.github.io/circles-sines-signals/index.html).

[^sine]: All you want to know about sinewaves (well, maybe...), [clearly explained with great visuals](http://jackschaedler.github.io/circles-sines-signals/sincos.html).
