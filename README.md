# trumpet

> **trumpet**
>
> *verb*
>
> proclaim widely or loudly.

## Requirements

* Withings scale, or other Withings hardware
* Home Assistant
* MQTT broker
* Google Home or similar

## Withings setup

Follow this guide: 

## Code Setup

* `cp .env.sample .env`
* Add variables to .env
* `npm install`
* `npm start`


## Home Assistant

In `automations.yml`, add the following, changing `topic`, `service` and `entity_id` according to your configuration. 

```
- alias: New weight
  trigger:
    platform: mqtt
    topic: 'weight/current'
  action:
    - service: tts.google_say
      entity_id: media_player.dining_room_speaker
      data:
        message: "Your weight is {{ trigger.payload }} kilos"
```
