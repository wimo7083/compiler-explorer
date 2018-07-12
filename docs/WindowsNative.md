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

Then, we'll need to make a configuration file which points at your compilers and
include directories. Copy the following into a new file,
`etc\config\c++.local.properties`:

```
includePath=C:\Program Files (x86)\Microsoft Visual Studio\2017\Enterprise\VC\Tools\MSVC\14.14.26428\ATLMFC\include;C:\Program Files (x86)\Microsoft Visual Studio\2017\Enterprise\VC\Tools\MSVC\14.14.26428\include;C:\Program Files (x86)\Windows Kits\10\include\10.0.17134.0\ucrt;C:\Program Files (x86)\Windows Kits\10\include\10.0.17134.0\shared;C:\Program Files (x86)\Windows Kits\10\include\10.0.17134.0\um;C:\Program Files (x86)\Windows Kits\10\include\10.0.17134.0\winrt;C:\Program Files (x86)\Windows Kits\10\include\10.0.17134.0\cppwinrt
compiler.clang_32.exe=C:\Program Files\LLVM\bin\clang++.exe
compiler.clang_64.exe=C:\Program Files\LLVM\bin\clang++.exe
compiler.vc2017_32.exe=C:\Program Files (x86)\Microsoft Visual Studio\2017\Enterprise\VC\Tools\MSVC\14.14.26428\bin\Hostx64\x86\cl.exe
compiler.vc2017_64.exe=C:\Program Files (x86)\Microsoft Visual Studio\2017\Enterprise\VC\Tools\MSVC\14.14.26428\bin\Hostx64\x64\cl.exe
```

These variables point to the correct locations on my personal machine, and
should work for anybody who has installed the Enterprise version of Visual
Studio 2017, and has put everything in the default place. You probably need
change the variables to point at your own setup.

First, `includePath`; use `echo %INCLUDE%` from a developer command prompt, copy
the result, and replace my paths with yours.

Second, `compiler.clang_32` and `compiler.clang_64` - these should be the same.
If it's in your path, you can use `where clang++`; if not, you'll have to find
your installation manually. If you don't have clang installed, you can remove
those lines.

Third, `compiler.vc2017_32` and `compiler.vc2017_64`; I recommend just looking
in explorer for your `cl.exe`.  Hopefully, I'll write a batch file eventually to
set this up for you, and if you have any questions, please ask on teams or
discord.

This should give you a complete, if basic setup. If you want to add more
compilers, look at my own personal configuration file, located at
`etc\config\c++.nicole.properties`; this should give you guidance on your
journey.


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
