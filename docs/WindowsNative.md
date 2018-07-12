# Running on Windows

Contact: [Nicole Mazzuca](https://github.com/ubsan) (if you're at microsoft,
please ping me on teams)

## Basic Setup

The setup on Windows should be fairly trivial; the only prerequisites, as far as
I can tell, are node. If you haven't yet installed node yet, you can grab it
from [here](https://nodejs.org/en/); you should grab the LTS release for
Windows.

Once you've done this, and added `npm` to the path, run the following commands
from any command line, in the directory you want the Compiler Explorer (from
here on, CE) to live:

```bat
git clone https://github.com/ubsan/compiler-explorer.git
```

Then, we'll need to make a configuration file
which points at your compilers and include directories.
Copy `etc\config\c++.nicole.properties` to a new file,
`etc\config\c++.local.properties`.

These variables point to the correct locations on my personal machine.
You probably need change the variables to point at your own setup.
Read the comments in the file to learn what to do.
If you have any questions, please ping me on discord or teams.


## Actually Running the danged thing

Once you've finished setting it up, you can `cd` into the `compiler-explorer`
directory, then run

```bat
npm install
npm start
```

Eventually, you'll see something that looks like

```
info: =======================================
info:   git release 96451ae8b92e420462137eaaec58f78d3cd6667b
info:   serving static files from 'static'
info:   Listening on http://localhost:10240/
info: =======================================
```

Now point your favorite web browser at http://localhost:10240 and you should be
done!

You only have to run `npm install` the first time; every time after that, you
should just be able to run `npm start`.

### Current Limitations

- Demangling is broken; make sure to turn off the demangling button from the CE
  web interface
- MSVC output is quite a bit uglier than clang output; it's being worked on.
- Other compilers, like NDK clang++, should be supported eventually. We're
  working on it :)
