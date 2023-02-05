<p align="center">
<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

# Homebridge Winker Plugin

[![npm](https://badgen.net/npm/v/homebridge-winker)
![npm](https://badgen.net/npm/dt/homebridge-winker)](https://www.npmjs.com/package/homebridge-winker)

[![github](https://badgen.net/github/release/jaisonerick/homebridge-winker)
![github](https://badgen.net/github/status/jaisonerick/homebridge-winker)
](https://github.com/jaisonerick/homebridge-winker)

Manage your [Winker](https://www.winker.com.br/) enabled building through [Homebridge](https://homebridge.io).

[![Winker](https://res.cloudinary.com/crunchbase-production/image/upload/c_lpad,f_auto,q_auto:eco,dpr_1/v1406926279/hfrwun4ykqmdn3khzodj.png)](https://www.winker.com.br/)

## Installation

```
npm i -g homebridge-winker
```

## Configuration

1. Navigate to the Plugins page in [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x).
2. Click the **Settings** button for the Winker plugin.
3. Enter your Winker's email, password, client key and building ID.
4. Add or remove which devices you want
5. Restart Homebridge so the Plugin can retrieve the list of devices.

The client key is subject to change and is based on their mobile application
connection key. The current value is available below:

```
63463194759174930521857349568326945725
```

After restart, head to the Logs page to see the list of devices you can add to
the plugin, with their ID numbers.

## Support

If you have a question, please [start a discussion](https://github.com/jaisonerick/homebridge-winker/discussions/new).
If you would like to report a bug, please [open an issue](https://github.com/jaisonerick/homebridge-winker/issues/new/choose).
