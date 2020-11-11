import React, { useState } from "react";
import lz4 from "lz4js";
import "./App.css";

import { open, TimeUtil } from "rosbag";

const App = (props: any) => {
  const [metadata, setMetadata] = useState<any>(null);
  const [topicList, setTopicList] = useState<string[]>([]);
  const [topicCounter, setTopicCounter] = useState<any>();
  const [progress, setProgress] = useState<number>(0);
  const [msgDefinitions, setMsgDefinitions] = useState<Map<string, string[]>>(
    new Map()
  );

  const process = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files.length === 0) {
      return;
    }
    const bag = await open(files[0]);

    setMetadata({
      startTime: bag.startTime,
      endTime: bag.endTime,
      duration: TimeUtil.compare(bag.endTime, bag.startTime),
    });

    const msgTypes = new Map<string, string[]>();

    interface Connection {
      topic: string;
      type: string;
      messageDefinition: string;
      callerid: string;
      md5sum: string;
    }
    Object.entries<Connection>(bag.connections).forEach(([_, v]) => {
      // console.log(v);
      msgTypes.set(v.topic, [
        v.callerid,
        v.type,
        v.md5sum,
        v.messageDefinition,
      ]);
    });

    setMsgDefinitions(msgTypes);

    const topics = new Set<string>();
    const counter = {};

    await bag.readMessages(
      {
        noParse: true,
        decompress: {
          lz4: (buffer: Buffer, size: number) => {
            const buff = new Buffer(lz4.decompress(buffer));
            return buff;
          },
        },
      },
      (res) => {
        const { topic, chunkOffset, totalChunks } = res;
        topics.add(topic);
        if (counter[topic]) {
          counter[topic] = counter[topic] + 1;
        } else {
          counter[topic] = 1;
        }

        setProgress(Math.round(((chunkOffset + 1) / totalChunks) * 100));
      }
    );

    setTopicCounter(counter);
    setTopicList(Array.from(topics).sort());
  };

  return (
    <>
      <div className="file">
        CHOOSE BAG:
        <input type="file" accept=".bag" onChange={process}></input>
      </div>
      {metadata ? (
        <div className="baginfo">
          <hr></hr>
          <div>
            {`Start Time: ${new Date(
              metadata.startTime.sec * 1000
            ).toLocaleString()} sec: ${metadata.startTime.sec} nsec: ${
              metadata.startTime.nsec
            }`}
          </div>
          <div>
            {`End Time: ${new Date(
              metadata.endTime.sec * 1000
            ).toLocaleString()} sec: ${metadata.endTime.sec} nesc: ${
              metadata.endTime.nsec
            } `}
          </div>
          <div>Duration: {metadata.duration}s</div>
          <hr />
          {progress < 100 ? (
            <div>Processing: {progress} %</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Caller ID</th>
                  <th>Message Definition</th>
                  <th>Message Definition MD5</th>
                  <th>Message Count</th>
                  <th>Message Frequency</th>
                </tr>
              </thead>

              <tbody>
                {topicList.map((t) => (
                  <tr id={t}>
                    <td>{t}</td>
                    <td>{msgDefinitions.get(t)[0]}</td>
                    <td>
                      <span title={msgDefinitions.get(t)[3]}>
                        {msgDefinitions.get(t)[1]}
                      </span>
                    </td>
                    <td>{msgDefinitions.get(t)[2]}</td>
                    <td>{topicCounter[t]}</td>
                    <td>{Math.round(topicCounter[t] / metadata.duration)}hz</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </>
  );
};

export default App;
