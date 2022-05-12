import { useMemo } from 'react';
import { ImageBitmapLoader } from 'three';

import rampsDataUri from '~/game/scene/asteroid/helpers/_ramps.png.datauri';
import constants from '~/lib/constants'
import Worker from 'worker-loader!../worker'; // eslint-disable-line

const { USE_DEDICATED_GPU_WORKER } = constants;

let workerIds = 0;

// TODO: remove debug
// let taskTotal = 0;
// let taskTally = 0;
// let resetPending = true;

// setInterval(() => {
//   if (!resetPending && taskTally > 0) {
//     console.log(
//       `avg response time (over ${taskTally}): ${Math.round(taskTotal / taskTally)}ms`,
//     );
//   }
// }, 5000);

class WorkerThread {
  constructor() {
    this.id = workerIds++;
    this.paramCache = {};
    this.messageCallback = null;

    this.worker = new Worker();
    this.worker.onmessage = (event) => {
      this.onMessage(event);
    };
  }

  onMessage(event) {
    const callback = this.messageCallback;
    this.messageCallback = null;
    if (callback) callback(event.data);
  }

  postMessage(msg, callback, transfer = []) {
    // if worker has cached cacheable params already, then don't include in params
    // else, if new, then note the new cache key
    if (msg._cacheable) {
      if (this.paramCache[msg._cacheable] === msg[msg._cacheable]?.key) {
        delete msg[msg._cacheable];
      } else {
        this.paramCache[msg._cacheable] = msg[msg._cacheable]?.key;
      }
      delete msg._cacheable;
    }

    msg._id = this.id;
    this.messageCallback = callback;
    this.worker.postMessage(msg, transfer);
  }
}

class WorkerThreadPool {
  constructor(tally, initForGpuWork) {
    this.workers = [...Array(tally)].map(_ => new WorkerThread());
    if (initForGpuWork) {
      this.available = [];
      this.initGpuAssets(tally);  // will set available once init'd available
    } else {
      this.available = [...this.workers];
    }
    this.busy = {};
    this.workQueue = [];
  }

  // NOTE: this helps speed up initial "on" time when using multiple gpu-focused
  //  webworkers concurrently... it's not necessary when using a dedicated gpu
  //  worker, but it doesn't hurt anything
  async initGpuAssets(tally) {
    const loader = new ImageBitmapLoader();
    loader.setOptions({ imageOrientation: 'flipY' });
    for(let i = 0; i < tally; i++) {
      const rampsBitmap = await loader.loadAsync(rampsDataUri);
      this.workers[i].postMessage({
        topic: 'initGpuAssets',
        data: {
          ramps: rampsBitmap
        }
      }, () => {
        this.available.push(this.workers[i]);
        if (this.workQueue.length) this.processQueue();
      }, [
        rampsBitmap
      ]);
    }
  }

  // i.e. post to all workers in pool
  broadcast(msg) {
    for(let i = 0; i < this.workers.length; i++) {
      this.workers[i].postMessage(msg);
    }
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

      // const startTime = Date.now();
      w.postMessage(workItem, (v) => {
        // if (resetPending && taskTally === 20) { // TODO: remove debug
        //   taskTotal = 0;
        //   taskTally = 0;
        //   resetPending = false;
        // }
        // taskTotal += Date.now() - startTime;
        // taskTally++;
        delete this.busy[w.id];
        this.available.push(w);
        workResolve(v);
        this.processQueue();
      });
    }
  }
}

const totalWorkers = (navigator?.hardwareConcurrency || 4) - 1; // CPUs minus 1
const dedicatedGpuWorkers = USE_DEDICATED_GPU_WORKER && totalWorkers >= 2 ? 1 : 0;
const cpuWorkerThreadPool = new WorkerThreadPool(totalWorkers - dedicatedGpuWorkers, dedicatedGpuWorkers === 0);
const gpuWorkerThreadPool = dedicatedGpuWorkers > 0 ? new WorkerThreadPool(dedicatedGpuWorkers, true) : null;

const useWebWorker = () => {
  return useMemo(() => ({
    broadcast: (message) => {
      cpuWorkerThreadPool.broadcast(message);
      if (gpuWorkerThreadPool) gpuWorkerThreadPool.broadcast(message);
    },
    processInBackground: (message, callback) => cpuWorkerThreadPool.addToQueue(message, callback),
    gpuProcessInBackground: (message, callback) => (gpuWorkerThreadPool || cpuWorkerThreadPool).addToQueue(message, callback),
  }), []);
};

export default useWebWorker;
