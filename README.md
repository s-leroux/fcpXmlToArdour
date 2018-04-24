A simple converter from FCP5 XML to Ardour XML

Designed and tested for FCP5 export from Lightworks to Ardour/Mixbus.
I don't have access to Final Cut Pro, so I can't say if it works with
a genuine FCP5 file.


Usage:
======

```
npm start&

curl -F xml=@sample.fcp5.xml -F sr=48000 http://localhost:8080/ > Ardour.test/test.ardour

```

Released as GPL-3.0-or-later
