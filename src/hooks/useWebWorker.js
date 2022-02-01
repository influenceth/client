import { useMemo } from 'react';
import Worker from 'worker-loader!../worker'; // eslint-disable-line

let workerIds = 0;

// TODO: remove debug
let taskTotal = 0;
let taskTally = 0;
let resetPending = true;

setInterval(() => {
  if (!resetPending && taskTally > 0) {
    console.log(
      `avg response time (over ${taskTally}): ${Math.round(taskTotal / taskTally)}ms`,
    );
  }
}, 5000);

class WorkerThread {
  constructor() {
    this.id = workerIds++;
    this.messageCallback = null;

    this.worker = new Worker();
    this.worker.onmessage = (event) => {
      this.onMessage(event);
    };
  }

  onMessage(event) {
    const callback = this.messageCallback;
    this.messageCallback = null;
    callback(event.data);
  }

  postMessage(msg, callback) {
    msg._id = this.id;
    this.messageCallback = callback;
    this.worker.postMessage(msg);
  }
}

class WorkerThreadPool {
  constructor(tally) {
    this.workers = [...Array(tally)].map(_ => new WorkerThread());
    this.available = [...this.workers];
    this.busy = {};
    this.workQueue = [];
  }

  getWorkerTally() {
    return this.workers.length;
  }

  isBusy() {
    return this.workQueue.length > 0 || Object.keys(this.busy).length > 0;
  }

  addToQueue(workItem, resolve) {
    this.workQueue.push([workItem, resolve]);
    this.processQueue();
  }

  processQueue() {
    while (this.available.length > 0 && this.workQueue.length > 0) {
      const w = this.available.pop();
      this.busy[w.id] = w;

      const [workItem, workResolve] = this.workQueue.shift();

      const startTime = Date.now();
      w.postMessage(workItem, (v) => {
        if (resetPending && taskTally === 20) {
          taskTotal = 0;
          taskTally = 0;
          resetPending = false;
        }
        taskTotal += Date.now() - startTime;
        taskTally++;
        delete this.busy[w.id];
        this.available.push(w);
        workResolve(v);
        this.processQueue();
      });
    }
  }
}

const workerThreadPool = new WorkerThreadPool(
  (navigator?.hardwareConcurrency || 4) - 1 // spare one for main thread
);

const useWebWorker = () => {
  return useMemo(() => ({
    isBusy: () => workerThreadPool.isBusy(),
    processInBackground: (message, callback) => workerThreadPool.addToQueue(message, callback)
  }), []);
};

export default useWebWorker;
