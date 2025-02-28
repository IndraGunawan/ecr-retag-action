const core = require('@actions/core');
const aws = require("@aws-sdk/client-ecr");

async function run() {
  try {
    const region = core.getInput('aws-region', { required: false })
    const ecrArgs = {}
    if (region) {
      ecrArgs['region'] = region
    }
    const ecr = new aws.ECR(ecrArgs)

    const registryId = core.getInput('aws-account-id', { required: false })
    const repositoryName = core.getInput('repository', { required: true })
    const imageTag = core.getInput('tag', { required: true })
    const newTags = core.getInput('new-tags', { required: true }).replace(/\s+/g, '').split(',')

    const getImageParams = { repositoryName, imageIds: [{ imageTag }] }
    if (registryId) {
      getImageParams['registryId'] = registryId
    }

    let putImageCallback = function (err, result) {
      if (err) {
        if (err instanceof aws.ImageAlreadyExistsException) {
          core.info(`${err.message}, no action`)
          return
        }
        core.setFailed(err.message)
      } else {
        let image = result.image
        core.info(`Image tagged: ${image.repositoryName}:${image.imageId.imageTag}`)
        core.debug(result)
      }
    }

    let getImageCallback = function (err, result) {
      if (err) {
        core.setFailed(err)
      } else {
        let image = result.images[0]
        core.info(`Image found: ${image.repositoryName}:${image.imageId.imageTag}`)
        core.debug(image)
        newTags.forEach(function (tag) {
          ecr.putImage(
            {
              registryId: image.registryId,
              repositoryName: image.repositoryName, /* required */
              imageManifest: image.imageManifest, /* required */
              imageTag: tag,
            },
            putImageCallback
          )
        })
      }
    }

    ecr.batchGetImage(getImageParams, getImageCallback);
  } catch (e) {
    core.setFailed(e instanceof Error ? e.message : JSON.stringify(e))
  }
}

module.exports = run;

/* istanbul ignore next */
if (require.main === module) {
  run();
}
