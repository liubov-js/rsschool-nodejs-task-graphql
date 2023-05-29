import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import { createProfileBodySchema, changeProfileBodySchema } from './schema';
import type { ProfileEntity } from '../../utils/DB/entities/DBProfiles';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<
    ProfileEntity[]
  > {
    return fastify.db.profiles.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      const profile = await this.db.profiles.findOne({ key: 'id', equals: request.params.id });

      if (!profile) {
        throw fastify.httpErrors.notFound();
      }

      const author = await this.db.users.findOne({ key: 'id', equals: profile.userId });

      if (!author) {
        throw fastify.httpErrors.notFound();
      }

      return profile;
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createProfileBodySchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      const user = await fastify.db.users.findOne({ key: 'id', equals: request.body.userId });
      if (user === null) {
        throw fastify.httpErrors.badRequest();
      }

      const memberType = await fastify.db.memberTypes.findOne({ key: 'id', equals: request.body.memberTypeId });
      if (memberType === null) {
        throw fastify.httpErrors.badRequest();
      }

      const profileByUserId = await fastify.db.profiles.findOne({ key: 'userId', equals: request.body.userId });
      if (profileByUserId !== null) {
        throw fastify.httpErrors.badRequest();
      }

      return await fastify.db.profiles.create(request.body);
    }
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      try {
        return await fastify.db.profiles.delete(request.params.id);
      } catch (error) {
        throw fastify.httpErrors.badRequest();
      }
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeProfileBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      const profile = await fastify.db.profiles.findOne({ key: 'id', equals: request.params.id });

      if (!profile) {
        throw fastify.httpErrors.notFound();
      }

      return await fastify.db.profiles.change(request.params.id, request.body);
    }
  );
};

export default plugin;
