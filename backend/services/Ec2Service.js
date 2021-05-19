/* eslint-disable no-shadow */
import AWS from 'aws-sdk';
import awsConfig from '../config/awsconfig.json';

const ec2CheckAndStartInstance = () => {
  AWS.config.update(awsConfig.ec2);
  // Create EC2 service object
  const ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });
  const params = {
    InstanceIds: [awsConfig.ec2.instanceId],
  };

  // check instance status
  ec2.describeInstanceStatus(params, (err, data) => {
    if (err) {
      // error occured
      console.error(err);
    }
    if (data.InstanceStatuses[0]) {
      // if running
      switch (data.InstanceStatuses[0].InstanceState.Name) {
        case 'running': {
          console.log('running');
          break;
        }
        default: {
          console.log(data.InstanceStatuses[0].InstanceState.Name);
          break;
        }
      }
    } else {
    // if stopped
      console.log('stopped');

      // start instance
      ec2.startInstances(params, (err, data) => {
        if (err && err.code === 'DryRunOperation') {
          params.DryRun = false;
          ec2.startInstances(params, (err, data) => {
            if (err) console.error(err);
            if (data) {
              console.log('Success', data.StartingInstances);
            }
          });
        }
      });
    }
  });
};

export default {
  ec2CheckAndStartInstance,
};
