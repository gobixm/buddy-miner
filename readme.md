# Buddy Miner

*Pulls auction data via battle net api and publishes it to kafka topic:*

### Outgoing message format
```javascript
{
    auc: 42,
    item: 42,
    owner: "kirill",
    bid: 42,
    quantity: 42,
    buyout: 42,
    timeLeft: "VERY_LONG",
    time: "iso with timezone"
}
```

### Configuration
[supported configuration formats](https://github.com/dominictarr/rc)
*Environment variables should be prefixed with* **buddy_miner_** (case matters)

| Parameter        | Default           |
| ------------- |:-------------:|
|consulHost|localhost|
|consulPort|9500|
|consulId|buddy_miner-0|
|hosting|https://localhost:8000|
|battleNetApiKey|<secret>|
|realms|howling-fjord|
|locale|ru_RU|
|kafkaBrokers|localhost:9092|
|checkIntervalMs|60000|
|battleNetUrl|eu.api.battle.net|

### Usage
npm start