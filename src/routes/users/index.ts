import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import {
  createUserBodySchema,
  changeUserBodySchema,
  subscribeBodySchema,
} from './schemas';
import type { UserEntity } from '../../utils/DB/entities/DBUsers';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<UserEntity[]> {
    return fastify.db.users.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const user = await fastify.db.users.findOne({ key: 'id', equals: request.params.id });

      if (!user) {
        throw fastify.httpErrors.notFound();
      }
      return user;
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createUserBodySchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      try {
        return await fastify.db.users.create(request.body);
      } catch (error) {
        throw fastify.httpErrors.badRequest();
      }

    }
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      try {
        const userToDelete = await fastify.db.users.delete(request.params.id);

        const userToDeleteProfile = await fastify.db.profiles.findOne({key: 'userId', equals: userToDelete.id});
        if (userToDeleteProfile) {
          await fastify.db.profiles.delete(userToDeleteProfile.id);
        }

        const userToDeletePosts = await fastify.db.posts.findMany({key: 'userId', equals: userToDelete.id});
        for (const post of userToDeletePosts) {
          await fastify.db.posts.delete(post.id);
        }

        const userToDeleteSubscribers = await fastify.db.users.findMany({
          key: 'subscribedToUserIds',
          equals: [userToDelete.id]
        });
        for (const subscriber of userToDeleteSubscribers) {
          await fastify.db.users.change(subscriber.id, {
            subscribedToUserIds: subscriber.subscribedToUserIds.filter((subscriberId) => subscriberId !== userToDelete.id),
          });
        }

        return userToDelete;

      } catch (error) {
        throw fastify.httpErrors.badRequest();
      }
    }
  );

  fastify.post(
    '/:id/subscribeTo',
    {
      schema: {
        body: subscribeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const userSubscriber = await fastify.db.users.findOne({ key: 'id', equals: request.params.id });
      const userFollower = await fastify.db.users.findOne({ key: 'id', equals: request.body.userId});
      if (!userSubscriber || !userFollower) {
        throw fastify.httpErrors.notFound();
      }

      const userIndex = userSubscriber.subscribedToUserIds.findIndex((user) => user === request.body.userId);
      if (userIndex != -1) {
        throw fastify.httpErrors.badRequest();
      }

      const subscriberSubscribedToIds = [...userSubscriber.subscribedToUserIds, userFollower.id];
      const followerSubscribedToUserIds = [...userFollower.subscribedToUserIds, userSubscriber.id];
      const userToUpdate = await fastify.db.users.change(request.params.id, { subscribedToUserIds: subscriberSubscribedToIds});
      await fastify.db.users.change(request.body.userId, { subscribedToUserIds: followerSubscribedToUserIds})
      return userToUpdate;
    }
  );

  fastify.post(
    '/:id/unsubscribeFrom',
    {
      schema: {
        body: subscribeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const userSubscriber = await fastify.db.users.findOne({ key: 'id', equals: request.params.id });
      const userFollower = await fastify.db.users.findOne({ key: 'id', equals: request.body.userId });
      if (!userSubscriber || !userFollower) {
        throw fastify.httpErrors.notFound();
      }

      const userSubscriberIndex = userSubscriber.subscribedToUserIds.findIndex((user) => user === request.body.userId);
      const userFollowerIndex = userFollower.subscribedToUserIds.findIndex((user) => user === request.params.id);
      if (userSubscriberIndex === -1 || userFollowerIndex === -1) {
        throw fastify.httpErrors.badRequest();
      }

      const userToUpdate = await fastify.db.users.change(request.params.id, { subscribedToUserIds: userSubscriber.subscribedToUserIds.filter(
          (user) => user != request.body.userId)});

      await fastify.db.users.change(request.body.userId, {subscribedToUserIds: userFollower.subscribedToUserIds.filter(
          (user) => user != request.params.id)});

      return userToUpdate;
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeUserBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const userToChange = await fastify.db.users.findOne({ key: 'id', equals: request.params.id });
      if (userToChange === null) {
        throw fastify.httpErrors.notFound();
      }

      return await fastify.db.users.change(request.params.id, request.body);
    }
  );
};

export default plugin;
