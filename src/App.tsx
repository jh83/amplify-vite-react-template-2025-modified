import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

import moment from "moment";
import { Line } from 'react-chartjs-2';

import {
  Badge,
  Button,
  Card,
  Collection,
  Divider,
  Flex,
  useAuthenticator,
  View,
  SelectField,
} from '@aws-amplify/ui-react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const client = generateClient<Schema>();

function App() {

  const { user, signOut } = useAuthenticator();

  const [selectedOption, setSelectedOption] = useState<string>("");

  const [devices, setDevices] = useState<Array<Schema["Devices"]["type"]>>([]);
  const [telemetries, setTelemetry] = useState<Array<Schema["Telemetry"]["type"]>>([]);
  const [_currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const filter = selectedOption && selectedOption !== "all"
      ? { filter: { device_id: { eq: selectedOption } } }
      : {};

    client.models.Telemetry.observeQuery(filter).subscribe({
      next: (data) => { setTelemetry([...data.items]), console.log(data.items) },
    });
  }, [selectedOption]); // Re-run when selectedOption changes

  useEffect(() => {
    client.models.Devices.observeQuery().subscribe({
      next: (data) => { setDevices([...data.items]) },
    });
  }, []);

  // Update current time every 30 seconds to refresh "Last Seen" timestamps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  function deleteTelemetry(device_id: string, timestamp: string) {
    client.models.Telemetry.delete({ device_id, timestamp })
  }

  function createDevice() {
    const device = String(window.prompt("Device ID"));
    client.models.Devices.create({ device_id: device, owner: user.userId })
  }

  function deleteDevice(device_id: string) {
    client.models.Devices.delete({ device_id })
  }

  const chartOptions = {

    onClick: function (evt: any, element: string | any[]) {
      evt;
      if (element.length > 0) {
        var ind = element[0].index;
        deleteTelemetry(telemetries[ind].device_id,  telemetries[ind].timestamp.toString())
      }
    },

    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    stacked: false,
    plugins: {
      title: {
        display: true,
        text: telemetries[0]?.device_id ? telemetries[0].device_id : "",
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        ticks: {
          callback: function (value: any) {
            return value + ' °C';
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        ticks: {
          callback: function (value: any) {
            return value + ' %';
          }
        }
      }
    },
  };


  const cartData = {
    labels: telemetries.map((data) => {
      return moment(data?.timestamp).format("HH:mm:ss");
    }),
    datasets: [
      {
        label: 'Temperature',
        data: telemetries.map((data) => {
          return data?.temperature;
        }),
        tension: 0.4,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y',
      },
      {
        label: 'Humidity',
        data: telemetries.map((data) => {
          return data?.humidity;
        }),
        tension: 0.4,
        borderColor: 'rgb(99, 255, 132)',
        backgroundColor: 'rgba(99, 255, 132, 0.5)',
        yAxisID: 'y1',
      }
    ],
  };


  return (
    <main>
      <h1>{user?.signInDetails?.loginId}'s Devices</h1>
      <Divider padding="xs" />
      <h3>Devices</h3>
      {
        <Button
          variation="primary"
          loadingText=""
          onClick={createDevice}
        >
          Add Device
        </Button>
      }

      <Divider padding="xs" />

      <Collection
        items={devices}
        type="list"
        direction="row"
        gap="20px"
        wrap="nowrap"
      >
        {(item, index) => (
          <Card
            key={index}
            borderRadius="medium"
            maxWidth="20rem"
            variation="outlined"
          >

            <View padding="xs">

              <br />
              <Flex>
                Status:
                <Badge variation={(item?.status == "connected") ? "success" : "error"} key={item.device_id}>
                  {item?.status ? item?.status.charAt(0).toUpperCase() + String(item?.status).slice(1) : ""}
                </Badge>
              </Flex>
              <Flex>
                {/* Last Seen: {telemetries.filter(t => t.device_id === item.device_id).sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp ? moment(telemetries.filter(t => t.device_id === item.device_id).sort((a, b) => b.timestamp - a.timestamp)[0].timestamp).fromNow() : "Never"} */}
              </Flex>
              <br />
              <Flex>ID: {item.device_id}</Flex>
              <br />
              <Button variation="destructive" isFullWidth onClick={() => deleteDevice(item.device_id)}>
                Delete
              </Button>
            </View>
          </Card>
        )}
      </Collection>

      <Divider padding="xs" />
      <SelectField
        label="Telemetry"
        descriptiveText="Select a device"
        value={selectedOption}
        onChange={(e) => { setSelectedOption(e.target.value) }}
      >
        <option value="all">All</option>
        {devices.map((device) => (
          <option key={device.device_id} value={device.device_id}>{device.device_id}</option>
        ))}
      </SelectField>

      <View padding="xs"></View>

      <Line options={chartOptions} data={cartData}></Line>

      <Divider padding="xs" />

      <button onClick={signOut}>Sign out</button>
    </main>
  );
}

export default App;
