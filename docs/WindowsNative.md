# Running on Windows

Contact: [Nicole Mazzuca](https://github.com/ubsan) (if you're at microsoft, please ping me on teams)

## Basic Setup

The setup on Windows should be fairly trivial; the only prerequisites, as far as I can tell, are node. If you haven't yet installed node yet, you can grab it from
[here](https://nodejs.org/en/); you should grab the LTS release for Windows.

Once you've done this, and added `npm` to the path, run the following commands from any command line, in the directory you want the Compiler Explorer (from here on, CE) to live:

```bat
git clone https://github.com/ubsan/compiler-explorer.git
```

Then, we'll need to edit the configuration file to point at your compilers and include directories. Open `etc\config\c++.local.properties` in a text editor.

The variables we want to change are as follows:

```
includePath
compiler.vc2017_32.exe
compiler.vc2017_64.exe
compiler.clang_32.exe
compiler.clang_64.exe
```

Set `includePath` to the result of running `echo %INCLUDE%` from a developer command line, and set each of the other variables to the location of their compilers; see `etc\config\c++.win32.properties` for examples.

This should give you a complete, if basic setup. If you want to add more compilers, look into `group.X.compilers`, where `X` is `vc2017_32`, `vc2017_64`, `clang_32`, and `clang_64`; if you want to add more groups,
you can do that in `group.vc2017`, as well as in the global `compilers` variable. Note that you _must_ have the same amount of group nesting for all groups. See `etc\config\c++.win32.properties` for examples.
If you want compiler-specific include paths, you can do that with `compiler.X.includePath=...`, as well as with `group.X.includePath=...`.


## Actually Running the danged thing

Once you've finished setting it up, you can `cd` into the `compiler-explorer` directory, then run

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

Now point your favorite web browser at http://localhost:10240 and you should be done!

You only have to run `npm install` the first time; every time after that, you should just be able to run `npm start`.

### Current Limitations

- Demangling is broken; make sure to turn off the demangling button from the CE web interface
- MSVC output is quite a bit uglier than clang output; it's being worked on.
- Other compilers, like NDK clang++, should be supported eventually. We're working on it :)
