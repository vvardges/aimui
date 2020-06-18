ifdef $(repo)
    repo = $(repo)
else
	repo = `pwd`/examples/.aim
endif

ifdef $(port)
    port = $(port)
else
	port = 43800
endif


dev:
	- make down
	- docker build -t aimhub-live-dev -f Dockerfile-dev .
	- make up

up:
	- docker run -it \
		--name aimhub-live-dev \
		-p 43800:43800 \
		-p 43801:43801 \
		-p 43802:43802 \
		-p 43803:43803 \
		-v `pwd`/client:/client \
		-v `pwd`/server:/server \
		-v $(repo):/store \
		-v "aim_live_db_dev:/var/lib/postgresql/data" \
		-e PROJECT_NAME=proj \
		aimhub-live-dev

down:
	- docker stop aimhub-live-dev
	- docker rm aimhub-live-dev

build:
	- docker build -t aimhub-live .

destroy:
	- docker stop aimhub-live
	- docker rm aimhub-live
	- docker image rm aimhub-live
	- docker stop aimhub-live-dev
	- docker rm aimhub-live-dev
	- docker image rm aimhub-live-dev

prod:
	- docker stop aimhub-live
	- docker rm aimhub-live
	- docker run -it --name aimhub-live -p $(port):80 -v `pwd`/.aim:/store aimhub-live

tag:
	docker tag aimhub-live aimhubio/aim-board:$(version)

push:
	make version=$(version) tag
	docker push aimhubio/aim-board:$(version)