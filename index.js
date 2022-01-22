const fs = require('fs').promises;
const qs = require('qs');
const axios = require('axios');
const mqtt = require('async-mqtt');
const express = require('express');
const bodyParser = require('body-parser');

const { CALLBACK_URL, PORT } = process.env;
const { WITHINGS_CLIENT_ID, WITHINGS_CLIENT_SECRET } = process.env;
const { MQTT_URL, MQTT_CHANNEL } = process.env;

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.listen(PORT);

const withingsAxios = axios.create({
  baseURL: 'https://wbsapi.withings.net',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
});

const getRefreshToken = async (userId) => fs.readFile(`./${userId}`, 'utf8');

const persistRefreshToken = async (userId, refreshToken) => fs.writeFile(`./${userId}`, refreshToken);

const refreshAccessToken = async (userId) => {
  const currentRefreshToken = await getRefreshToken(userId);

  const data = {
    action: 'requesttoken',
    grant_type: 'refresh_token',
    client_id: WITHINGS_CLIENT_ID,
    client_secret: WITHINGS_CLIENT_SECRET,
    refresh_token: currentRefreshToken,
  };

  const body = qs.stringify(data);

  const response = await withingsAxios.post('/v2/oauth2', body);

  const newRefreshAccessToken = response.data.body.refresh_token;
  await persistRefreshToken(userId, newRefreshAccessToken);

  return response.data.body.access_token;
};

const getMeasures = async (accessToken, startDate, endDate) => {
  const data = {
    action: 'getmeas',
    meastype: 1,
    category: 1,
    startdate: startDate,
    enddate: endDate,
  };

  const body = qs.stringify(data);

  const response = await withingsAxios.post(
    '/measure',
    body,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  return response.data.body.measuregrps;
};

const getLatestWeightFromMeasures = (measure) => measure[0].measures[0].value;

const grams2Kilo = (grams) => grams / 1000;

const broadcast = async (value) => {
  const client = await mqtt.connectAsync(MQTT_URL);
  await client.publish(MQTT_CHANNEL, value.toFixed(1));
  await client.end();
};

app.post('/withingsWebhook', async (request, response) => {
  response.send('ok');

  const userId = request.body.userid;
  const startDate = request.body.startdate;
  const endDate = request.body.enddate;

  const accessToken = await refreshAccessToken(userId);
  const measures = await getMeasures(accessToken, startDate, endDate);
  const weightInGrams = getLatestWeightFromMeasures(measures);
  const weightInKilos = grams2Kilo(weightInGrams);
  await broadcast(weightInKilos);
});

app.get('/url', async (_, response) => {
  response.send(
    `<a href="https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=${WITHINGS_CLIENT_ID}&state=whatever&scope=user.info,user.metrics&redirect_uri=${CALLBACK_URL}">Click here</a>`,
  );
});
