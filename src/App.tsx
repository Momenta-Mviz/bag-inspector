import React, { useState } from "react";
import lz4 from "lz4js";
import "./App.css";

import { open, TimeUtil } from "rosbag";

const App = (props: any) => {
  const [meta, setmeta] = useState<any>(null);
  const [topicList, setTopicList] = useState<string[]>([]);
  const [topicCounter, setTopicCounter] = useState<any>();
  const [progress, setProgress] = useState<number>(0);
  const [topicMsgDefinitions, setTopicMsgDefinitions] = useState<
    Map<string, string>
  >(new Map());

  const process = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files.length === 0) {
      return;
    }
    const bag = await open(files[0]);

    setmeta({
      startTime: bag.startTime,
      endTime: bag.endTime,
      duration: TimeUtil.compare(bag.endTime, bag.startTime),
    });

    const msgTypes = new Map<string, string>();

    Object.entries<{ topic: string; type: string }>(bag.connections).forEach(
      ([_, v]) => {
        msgTypes.set(v.topic, v.type);
      }
    );

    setTopicMsgDefinitions(msgTypes);

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
      {meta ? (
        <div className="baginfo">
          <hr></hr>
          <div>
            Start Time: {new Date(meta.startTime.sec * 1000).toLocaleString()},{" "}
            {meta.startTime.sec}-{meta.startTime.nsec}
          </div>
          <div>
            End Time: {new Date(meta.endTime.sec * 1000).toLocaleString()},{" "}
            {meta.endTime.sec}-{meta.endTime.nsec}
          </div>
          <div>Duration: {meta.duration}s</div>
          <hr />
          {progress < 100 ? (
            <div>Processing: {progress} %</div>
          ) : (
            <table>
              {topicList.map((t) => (
                <tr id={t}>
                  <td>{t}</td>
                  <td>{topicMsgDefinitions.get(t)}</td>{" "}
                  <td>{topicCounter[t]}</td>
                  <td>{Math.round(topicCounter[t] / meta.duration)}hz</td>
                </tr>
              ))}
            </table>
          )}
        </div>
      ) : null}
    </>
  );
};

export default App;
